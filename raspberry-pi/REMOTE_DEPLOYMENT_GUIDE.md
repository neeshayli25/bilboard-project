# Remote Raspberry Pi Billboard Deployment Guide

This guide is for the final real-world version where the Raspberry Pi and monitor may be in another room, building, city, or country.

The Raspberry Pi does not need to be on the same Wi-Fi as your laptop. It only needs internet access.

## Final Architecture

```text
Admin Laptop / Phone
  |
  | Opens Vercel frontend
  v
Vercel Frontend
  |
  | Calls API
  v
Render Backend
  |
  | Reads bookings, schedules, ads, media
  v
MongoDB Atlas + GridFS Media Storage
  ^
  |
  | Polls API through internet
  |
Raspberry Pi at billboard location
  |
  | HDMI output
  v
Monitor / Billboard Screen
```

## What Happens In Real Use

1. Admin opens the Vercel website from any laptop or phone.
2. Advertiser uploads an ad and creates a booking.
3. Admin approves booking and verifies payment.
4. Render backend stores the booking schedule and media URL.
5. Raspberry Pi keeps calling the Render backend every few seconds.
6. If no ad is active, the monitor stays black.
7. When the scheduled time arrives, Render returns the active ad.
8. Raspberry Pi downloads/caches the ad and displays it full-screen on the HDMI monitor.
9. When the ad time ends, Render returns idle/scheduled status and the Pi goes back to black screen.
10. If admin clicks Display Now, Render temporarily marks that ad as active and the Pi displays it immediately.

## Why Same Wi-Fi Is Not Required

Same Wi-Fi was only needed when the Raspberry Pi was connecting to a laptop-local backend like:

```text
http://192.168.x.x:5000/api
```

For the deployed version, the Pi connects to Render through the internet:

```text
https://your-cdbms-backend.onrender.com/api
```

That means the Pi can be anywhere, as long as it has internet.

## Important Production URLs

Use these correctly:

- Vercel frontend URL: used by admin/advertisers in browser.
- Render backend URL: used by the Raspberry Pi player.

The Raspberry Pi config must use the Render backend API URL, not `localhost`.

Example:

```json
{
  "apiBase": "https://your-cdbms-backend.onrender.com/api",
  "billboardId": "PASTE_BILLBOARD_ID_HERE",
  "deviceToken": "PASTE_SCREEN_TOKEN_HERE",
  "deviceLabel": "Raspberry Pi Billboard Screen",
  "pollSeconds": 3,
  "requestTimeoutSeconds": 45,
  "debug": false
}
```

## Raspberry Pi OS Installation On microSD

Do this on your laptop.

1. Download Raspberry Pi Imager from:

```text
https://www.raspberrypi.com/software/
```

2. Insert the microSD card into your laptop using a card reader.

3. Open Raspberry Pi Imager.

4. Choose device:

```text
Raspberry Pi 3
```

5. Choose OS:

```text
Raspberry Pi OS with desktop
```

Use the desktop version because the billboard player needs to draw on the HDMI screen.

6. Choose storage:

```text
Your microSD card
```

7. Click the settings/gear option if shown and configure:

- Hostname: `cdbms-billboard`
- Username: `pi` or your own username
- Password: any password you remember
- Wi-Fi SSID and password for the location where the Pi will run
- Locale/timezone
- Enable SSH if you want remote access

8. Click Write.

9. Wait until writing and verification finish.

10. Remove the microSD safely and insert it into the Raspberry Pi.

## First Boot

1. Connect Raspberry Pi HDMI to the monitor.
2. Connect keyboard/mouse temporarily for setup.
3. Power on the monitor.
4. Power on the Raspberry Pi.
5. Connect the Pi to Wi-Fi if not already configured.
6. Open Terminal on the Pi.

## Install The Billboard Player

Copy this `raspberry-pi` folder to the Pi.

Recommended location:

```bash
~/cdbms-billboard
```

Run:

```bash
cd ~/cdbms-billboard
bash install_on_pi.sh
```

Then edit:

```bash
nano ~/cdbms-billboard/config.json
```

Set your Render backend URL, billboard ID, and token.

## Test Manually

Run:

```bash
python3 ~/cdbms-billboard/billboard_player.py --config ~/cdbms-billboard/config.json
```

Expected result:

- Monitor becomes black full-screen.
- Admin panel should show the Pi screen as online after heartbeat.
- Clicking Display Now should show the selected ad on the monitor.
- When no active ad exists, the monitor returns to black.

Press `Esc` to stop the player during testing.

## Auto Start

The installer creates:

```text
~/.config/autostart/cdbms-billboard.desktop
```

After reboot, the player starts automatically.

Run:

```bash
sudo reboot
```

After reboot, do not open any browser or URL manually. The Raspberry Pi should start the player by itself.

## Render Free Plan Warning

If Render is on the free plan, the backend may sleep when unused. The first request from the Raspberry Pi can take time to wake it up.

The Pi player handles this by retrying and using a longer timeout. For a smoother demo, open the Vercel admin site once before showing the teacher, or use a paid Render instance so the backend stays awake.

## Teacher Demo Explanation

Say this:

```text
The CDBMS frontend is deployed on Vercel and the backend is deployed on Render.
The Raspberry Pi is installed at the billboard location and connected to the monitor through HDMI.
It does not need to be on the same Wi-Fi as the admin laptop because it communicates with the Render backend over the internet.
The Pi runs a native full-screen player on boot, polls the backend using its billboard ID and secure screen token, downloads the active ad, and displays it full-screen.
When no ad is scheduled or active, the screen stays black like an idle billboard.
```
