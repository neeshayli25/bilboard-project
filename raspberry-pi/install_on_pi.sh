#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${HOME}/cdbms-billboard"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_PATH="/etc/systemd/system/cdbms-billboard.service"
BOOT_CONFIG="/boot/firmware/config.txt"

if [ ! -f "${BOOT_CONFIG}" ]; then
  BOOT_CONFIG="/boot/config.txt"
fi

echo "Installing CDBMS Raspberry Pi billboard player..."

sudo apt update
sudo apt install -y python3 python3-pip python3-requests python3-pygame python3-pil vlc unclutter

mkdir -p "${APP_DIR}"
cp "${SCRIPT_DIR}/billboard_player.py" "${APP_DIR}/billboard_player.py"
cp "${SCRIPT_DIR}/config.example.json" "${APP_DIR}/config.example.json"
cp "${SCRIPT_DIR}/cdbms-billboard.service" "${APP_DIR}/cdbms-billboard.service.template"

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

sed \
  -e "s#__USER__#${USER}#g" \
  -e "s#__HOME__#${HOME}#g" \
  -e "s#__APP_DIR__#${APP_DIR}#g" \
  "${SCRIPT_DIR}/cdbms-billboard.service" > /tmp/cdbms-billboard.service

sudo mv /tmp/cdbms-billboard.service "${SERVICE_PATH}"
sudo systemctl daemon-reload
sudo systemctl enable cdbms-billboard.service

if [ -f "${BOOT_CONFIG}" ] && ! grep -q "CDBMS billboard HDMI" "${BOOT_CONFIG}"; then
  sudo tee -a "${BOOT_CONFIG}" >/dev/null <<'EOF'

# CDBMS billboard HDMI
hdmi_force_hotplug=1
hdmi_drive=2
disable_overscan=1
EOF
fi

echo ""
echo "Installed."
echo "Next steps:"
echo "1. Edit ${APP_DIR}/config.json"
echo "2. Test with: python3 ${APP_DIR}/billboard_player.py --config ${APP_DIR}/config.json"
echo "3. Start the service: sudo systemctl start cdbms-billboard"
echo "4. Reboot the Pi when the test works: sudo reboot"
