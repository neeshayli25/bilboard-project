# CDBMS Raspberry Pi Billboard Player

This folder turns a Raspberry Pi 3 plus HDMI LCD into a real CDBMS display device. The Pi polls the Render backend, downloads/caches ad media, plays active ads full screen, reports heartbeats, and starts again automatically after reboot.

## Hardware

1. Flash Raspberry Pi OS with Desktop to the microSD card.
2. Connect the HDMI LCD to the Raspberry Pi HDMI port.
3. Power the HDMI LCD.
4. Power the Raspberry Pi with a stable 5V adapter.
5. Connect the Pi to Wi-Fi or Ethernet.

## Backend Values Needed

From the CDBMS admin panel, open the billboard/device card and copy:

- `apiBase`: Render backend API URL, for example `https://your-cdbms-backend.onrender.com/api`
- `billboardId`: the billboard MongoDB id or the unique billboard name, for example `B`
- `deviceToken`: the screen token from the billboard display config

The Pi sends the token as `x-device-token`. If the token is rotated in admin, update `config.json` on the Pi.

## Install On Raspberry Pi

Copy this `raspberry-pi` folder to the Pi, then run:

```bash
cd raspberry-pi
chmod +x install_on_pi.sh
./install_on_pi.sh
```

The installer:

- Installs Python, Requests, Pygame, Pillow, VLC, and unclutter.
- Creates `~/cdbms-billboard`.
- Installs `billboard_player.py`.
- Creates `~/cdbms-billboard/config.json` if missing.
- Installs and enables `cdbms-billboard.service`.
- Adds HDMI hotplug settings to `/boot/firmware/config.txt` or `/boot/config.txt`.
- Adds a desktop autostart fallback.

## Configure The Player

Edit:

```bash
nano ~/cdbms-billboard/config.json
```

Example:

```json
{
  "apiBase": "https://your-cdbms-backend.onrender.com/api",
  "billboardId": "B",
  "deviceToken": "PASTE_SCREEN_TOKEN_HERE",
  "deviceLabel": "Raspberry Pi Billboard Screen",
  "pollSeconds": 3,
  "heartbeatSeconds": 10,
  "requestTimeoutSeconds": 45,
  "debug": false
}
```

## Manual Test

```bash
python3 ~/cdbms-billboard/billboard_player.py --config ~/cdbms-billboard/config.json
```

Expected behavior:

- No active ad: black idle display.
- Active scheduled ad: full-screen image or video.
- Admin "Display Now": full-screen media immediately.
- Backend offline: black idle display and automatic retry.

Press `Esc` or `Ctrl+C` to stop the manual test.

## Start On Boot

The installer enables systemd automatically. To control it:

```bash
sudo systemctl start cdbms-billboard
sudo systemctl status cdbms-billboard
sudo systemctl restart cdbms-billboard
sudo journalctl -u cdbms-billboard -f
```

Reboot test:

```bash
sudo reboot
```

After reboot, the Pi should open the full-screen player without manual action.

## API Contract

The Pi calls:

```http
GET /api/hardware/display/B
x-device-token: YOUR_SCREEN_TOKEN
```

Active response:

```json
{
  "type": "active",
  "content": {
    "title": "Nike Ad",
    "mediaUrl": "https://...",
    "mediaType": "video",
    "duration": 30
  }
}
```

The Pi reports:

```http
POST /api/hardware/heartbeat/B
x-device-token: YOUR_SCREEN_TOKEN
```

## Production Flow

1. Admin creates a unique billboard such as `B`.
2. Admin copies the generated display token.
3. Advertiser uploads an ad and books a slot.
4. Admin approves ad/payment, booking becomes `scheduled`.
5. At the scheduled time, `/api/hardware/display/B` returns `type: active`.
6. Raspberry Pi downloads the media and displays it full screen on HDMI.
7. Pi sends heartbeat so the admin panel shows online/offline status.
8. If the Pi restarts, systemd launches the player again.
