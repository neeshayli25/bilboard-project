# CDBMS Raspberry Pi Billboard Player

This folder is for the real hardware display. The Raspberry Pi becomes a billboard device connected to the monitor by HDMI.

For local demos, your laptop can run the CDBMS backend/frontend. For the final deployed version, Vercel runs the frontend and Render runs the backend. The Raspberry Pi runs this player automatically and keeps the monitor black until an ad is active.

For remote billboard/city/location deployment, read `REMOTE_DEPLOYMENT_GUIDE.md`.

## What This Does

- Boots the Raspberry Pi.
- Opens a full-screen black player automatically.
- Polls your CDBMS backend every few seconds.
- Shows the scheduled ad only when the backend says it is active.
- Shows an ad immediately when admin clicks Display Now.
- Goes back to black idle screen when no ad is active.
- Sends heartbeat/status back to CDBMS so the admin panel can show the Pi screen as connected.

No Arduino is required.

## Hardware Connection

1. Put Raspberry Pi OS on the microSD card.
2. Insert the microSD card into the Raspberry Pi.
3. Connect Raspberry Pi HDMI to the monitor HDMI.
4. Power the monitor on.
5. Power the Raspberry Pi with a proper micro-USB adapter.
6. Connect the Raspberry Pi to Wi-Fi/internet.

The monitor is treated as the billboard. The laptop is only the control/admin computer.

## One-Time Raspberry Pi Setup

Open Terminal on the Raspberry Pi and install the required packages:

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-requests python3-pygame python3-pil vlc unclutter
```

Copy this `raspberry-pi` folder to the Raspberry Pi, for example:

```bash
mkdir -p ~/cdbms-billboard
```

Then place these files inside `~/cdbms-billboard`.

## Configuration

Create a config file:

```bash
cp config.example.json config.json
```

Edit `config.json`:

```bash
nano config.json
```

Set:

- `apiBase`: your deployed Render backend API URL, for example `https://your-cdbms-backend.onrender.com/api`
- `billboardId`: the billboard ID from your admin panel
- `deviceToken`: the screen token from your admin panel

For local testing only, your laptop IP can be found on Windows using:

```powershell
ipconfig
```

Use the IPv4 address of the Wi-Fi adapter. For the real remote version, use the Render URL instead.

## Manual Test

Run this on the Raspberry Pi:

```bash
cd ~/cdbms-billboard
python3 billboard_player.py --config config.json
```

Expected behavior:

- If no ad is active, the monitor stays black.
- If you click Display Now in the admin panel, the ad appears full-screen.
- If the scheduled time arrives, the ad appears automatically.

Press `Esc` or `Ctrl+C` to stop during testing.

## Auto Start On Boot

Create the autostart folder:

```bash
mkdir -p ~/.config/autostart
```

Create the desktop autostart file:

```bash
nano ~/.config/autostart/cdbms-billboard.desktop
```

Paste this:

```ini
[Desktop Entry]
Type=Application
Name=CDBMS Billboard Player
Exec=/usr/bin/python3 /home/pi/cdbms-billboard/billboard_player.py --config /home/pi/cdbms-billboard/config.json
Terminal=false
X-GNOME-Autostart-enabled=true
```

If your Raspberry Pi username is not `pi`, replace `/home/pi` with your username path.

Reboot:

```bash
sudo reboot
```

After reboot, you should not need to open anything. The Pi should automatically show the black idle billboard player.

## Demo Explanation For Teacher

The Raspberry Pi is configured as a dedicated display device. It is connected to the monitor through HDMI. The laptop runs the CDBMS admin panel and backend. The Pi polls the backend using the billboard ID and device token. When a booking reaches its scheduled time, or when admin clicks Display Now, the Pi receives the ad media URL, downloads/caches it, and displays it full-screen on the monitor. When the ad is not active anymore, the player returns to a black idle display.
