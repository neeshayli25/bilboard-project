#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${HOME}/cdbms-billboard"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing CDBMS Raspberry Pi billboard player..."

sudo apt update
sudo apt install -y python3 python3-pip python3-requests python3-pygame python3-pil vlc unclutter

mkdir -p "${APP_DIR}"
cp "${SCRIPT_DIR}/billboard_player.py" "${APP_DIR}/billboard_player.py"
cp "${SCRIPT_DIR}/config.example.json" "${APP_DIR}/config.example.json"

if [ ! -f "${APP_DIR}/config.json" ]; then
  cp "${APP_DIR}/config.example.json" "${APP_DIR}/config.json"
  echo "Created ${APP_DIR}/config.json. Edit it with your Render backend URL, billboard ID, and token."
fi

mkdir -p "${HOME}/.config/autostart"
cat > "${HOME}/.config/autostart/cdbms-billboard.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=CDBMS Billboard Player
Exec=/usr/bin/python3 ${APP_DIR}/billboard_player.py --config ${APP_DIR}/config.json
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

chmod +x "${APP_DIR}/billboard_player.py"

echo ""
echo "Installed."
echo "Next steps:"
echo "1. Edit ${APP_DIR}/config.json"
echo "2. Test with: python3 ${APP_DIR}/billboard_player.py --config ${APP_DIR}/config.json"
echo "3. Reboot the Pi when the test works: sudo reboot"
