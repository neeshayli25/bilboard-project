#!/usr/bin/env python3
"""Native Raspberry Pi billboard player for CDBMS.

The player keeps the HDMI monitor black while idle, polls the CDBMS backend,
and displays only active/manual-push ads in full screen.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urljoin, urlparse

import pygame
import requests
from PIL import Image


APP_DIR = Path(__file__).resolve().parent
CACHE_DIR = APP_DIR / "cache"
DEFAULT_CONFIG_PATH = APP_DIR / "config.json"
BLACK = (0, 0, 0)
TEXT = (200, 210, 220)
MUTED = (90, 100, 115)


class BillboardPlayer:
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.api_base = str(config.get("apiBase", "")).rstrip("/")
        self.billboard_id = str(config.get("billboardId", "")).strip()
        self.device_token = str(config.get("deviceToken", "")).strip()
        self.device_label = str(config.get("deviceLabel", "Raspberry Pi Billboard Screen")).strip()
        self.poll_seconds = max(1, int(config.get("pollSeconds", 3) or 3))
        self.request_timeout = max(8, int(config.get("requestTimeoutSeconds", 45) or 45))
        self.debug = bool(config.get("debug", False))
        self.current_key = ""
        self.video_process: subprocess.Popen[str] | None = None
        self.running = True

        CACHE_DIR.mkdir(exist_ok=True)

        pygame.init()
        pygame.mouse.set_visible(False)
        self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
        pygame.display.set_caption("CDBMS Billboard Player")
        self.font = pygame.font.SysFont("Arial", 26)
        self.small_font = pygame.font.SysFont("Arial", 18)
        self.show_idle("Connecting to CDBMS")

    def stop(self) -> None:
        self.running = False
        self.stop_video()
        pygame.quit()

    def stop_video(self) -> None:
        if not self.video_process:
            return

        if self.video_process.poll() is None:
            self.video_process.terminate()
            try:
                self.video_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.video_process.kill()

        self.video_process = None

    def pump_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            if event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_q):
                self.running = False

    def draw_center_text(self, title: str, subtitle: str = "") -> None:
        self.screen.fill(BLACK)
        if self.debug:
            title_surface = self.font.render(title, True, TEXT)
            self.screen.blit(
                title_surface,
                title_surface.get_rect(center=(self.screen.get_width() // 2, self.screen.get_height() // 2 - 18)),
            )
            if subtitle:
                subtitle_surface = self.small_font.render(subtitle, True, MUTED)
                self.screen.blit(
                    subtitle_surface,
                    subtitle_surface.get_rect(center=(self.screen.get_width() // 2, self.screen.get_height() // 2 + 22)),
                )
        pygame.display.flip()

    def show_idle(self, message: str = "No active ad") -> None:
        self.stop_video()
        if self.current_key != f"idle:{message}":
            self.current_key = f"idle:{message}"
            self.draw_center_text("CDBMS Display Ready", message)

    def endpoint(self) -> str:
        params = urlencode({"billboardId": self.billboard_id, "token": self.device_token})
        return f"{self.api_base}/display/current?{params}"

    def heartbeat_url(self) -> str:
        params = urlencode({"token": self.device_token})
        return f"{self.api_base}/hardware/heartbeat/{self.billboard_id}?{params}"

    def app_origin(self) -> str:
        if self.api_base.endswith("/api"):
            return self.api_base[:-4]
        parsed = urlparse(self.api_base)
        return f"{parsed.scheme}://{parsed.netloc}"

    def resolve_media_url(self, raw_url: str) -> str:
        value = str(raw_url or "").strip()
        if not value:
            return ""
        if value.startswith(("http://", "https://", "data:", "blob:")):
            return value
        if value.startswith("//"):
            return f"http:{value}"
        return urljoin(f"{self.app_origin()}/", value.lstrip("/"))

    def fetch_payload(self) -> dict[str, Any]:
        response = requests.get(self.endpoint(), timeout=self.request_timeout)
        response.raise_for_status()
        return response.json()

    def send_heartbeat(self, payload: dict[str, Any]) -> None:
        if not self.billboard_id:
            return

        body = {
            "deviceLabel": self.device_label,
            "browserConnected": True,
            "arduinoConnected": False,
            "serialMode": "raspberry_pi_native_player",
            "playbackState": payload.get("status") or "idle",
            "nowPlayingTitle": payload.get("title") or "",
            "bookingId": payload.get("bookingId") or "",
            "hardwareNotes": "Native Raspberry Pi HDMI player",
        }

        try:
            requests.post(self.heartbeat_url(), json=body, timeout=10)
        except requests.RequestException:
            pass

    def download_media(self, media_url: str) -> Path:
        parsed = urlparse(media_url)
        guessed_ext = Path(parsed.path).suffix
        if not guessed_ext:
            content_type = requests.head(media_url, timeout=10).headers.get("content-type", "")
            guessed_ext = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ".media"

        filename = f"{hashlib.sha256(media_url.encode('utf-8')).hexdigest()[:24]}{guessed_ext}"
        target = CACHE_DIR / filename
        if target.exists() and target.stat().st_size > 0:
            return target

        tmp = target.with_suffix(f"{target.suffix}.tmp")
        with requests.get(media_url, stream=True, timeout=self.request_timeout) as response:
            response.raise_for_status()
            with tmp.open("wb") as file:
                for chunk in response.iter_content(chunk_size=1024 * 256):
                    if chunk:
                        file.write(chunk)
        tmp.replace(target)
        return target

    def show_image(self, media_path: Path, media_key: str) -> None:
        self.stop_video()
        if self.current_key == media_key:
            return

        image = Image.open(media_path).convert("RGB")
        screen_w, screen_h = self.screen.get_size()
        image_w, image_h = image.size
        scale = max(screen_w / image_w, screen_h / image_h)
        new_size = (int(image_w * scale), int(image_h * scale))
        image = image.resize(new_size, Image.LANCZOS)

        left = (new_size[0] - screen_w) // 2
        top = (new_size[1] - screen_h) // 2
        image = image.crop((left, top, left + screen_w, top + screen_h))

        surface = pygame.image.fromstring(image.tobytes(), image.size, "RGB")
        self.screen.blit(surface, (0, 0))
        pygame.display.flip()
        self.current_key = media_key

    def show_video(self, media_path: Path, media_key: str) -> None:
        if self.current_key == media_key and self.video_process and self.video_process.poll() is None:
            return

        self.stop_video()
        self.screen.fill(BLACK)
        pygame.display.flip()

        command = [
            "cvlc",
            "--fullscreen",
            "--no-video-title-show",
            "--no-osd",
            "--quiet",
            "--input-repeat=999",
            str(media_path),
        ]
        self.video_process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True)
        self.current_key = media_key

    def is_video(self, payload: dict[str, Any], media_url: str, media_path: Path) -> bool:
        media_type = str(payload.get("mediaType") or payload.get("ad", {}).get("mediaType") or "").lower()
        if media_type == "video":
            return True
        ext = media_path.suffix.lower()
        return ext in {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}

    def should_show(self, payload: dict[str, Any]) -> bool:
        if payload.get("status") != "active":
            return False
        media_url = payload.get("imageUrl") or payload.get("ad", {}).get("mediaUrl") or ""
        return bool(media_url)

    def render_payload(self, payload: dict[str, Any]) -> None:
        if not self.should_show(payload):
            self.show_idle("Waiting for scheduled ad")
            return

        raw_media_url = payload.get("imageUrl") or payload.get("ad", {}).get("mediaUrl") or ""
        media_url = self.resolve_media_url(raw_media_url)
        if not media_url:
            self.show_idle("No media URL")
            return

        media_path = self.download_media(media_url)
        media_key = f"{payload.get('bookingId', '')}:{payload.get('updatedAt', '')}:{media_url}"

        if self.is_video(payload, media_url, media_path):
            self.show_video(media_path, media_key)
        else:
            self.show_image(media_path, media_key)

    def loop(self) -> None:
        if not self.api_base or not self.billboard_id or not self.device_token:
            self.show_idle("Missing config.json values")

        while self.running:
            self.pump_events()
            try:
                if not self.api_base or not self.billboard_id or not self.device_token:
                    time.sleep(self.poll_seconds)
                    continue

                payload = self.fetch_payload()
                self.render_payload(payload)
                self.send_heartbeat(payload)
            except Exception as error:  # noqa: BLE001 - keep display alive for demo day.
                self.show_idle(f"Backend unavailable: {error}" if self.debug else "Backend unavailable")

            for _ in range(self.poll_seconds * 10):
                if not self.running:
                    break
                self.pump_events()
                time.sleep(0.1)


def load_config(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> int:
    parser = argparse.ArgumentParser(description="CDBMS Raspberry Pi billboard player")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to config.json")
    args = parser.parse_args()

    config = load_config(Path(args.config).expanduser())
    player = BillboardPlayer(config)

    def handle_stop(_signum: int, _frame: Any) -> None:
        player.stop()

    signal.signal(signal.SIGINT, handle_stop)
    signal.signal(signal.SIGTERM, handle_stop)

    try:
        player.loop()
    finally:
        player.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())
