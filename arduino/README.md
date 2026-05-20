# Arduino Uno Setup For CDBMS

## What your current Arduino can and cannot do

You have an Arduino Uno. With only this board and jumper wires:

- It **can** connect to your laptop by USB.
- It **can** receive simple serial messages from your CDBMS project.
- It **can** show status using the built-in LED and the Arduino Serial Monitor.
- It **cannot** connect to your server by itself.
- It **cannot** display billboard images or videos by itself.

That means the working setup right now is:

1. Your CDBMS backend stays the server.
2. A laptop/PC browser window becomes the actual billboard screen.
3. The Arduino Uno acts as the hardware bridge/status device over USB.

## Files added

- Sketch: [CDBMS_UNO_DisplayBridge.ino](C:/Users/Nisha%20Ali/Desktop/project%20practice/arduino/CDBMS_UNO_DisplayBridge/CDBMS_UNO_DisplayBridge.ino)
- Display page: [display-simulator.html](C:/Users/Nisha%20Ali/Desktop/project%20practice/react-frontend/public/display-simulator.html)

## What you need physically

- Arduino Uno
- USB A-to-B cable for Arduino Uno
- Laptop or PC
- Optional second monitor/TV if you want a bigger "billboard screen"

## Step 1: Upload the Arduino sketch

1. Open Arduino IDE.
2. Open [CDBMS_UNO_DisplayBridge.ino](C:/Users/Nisha%20Ali/Desktop/project%20practice/arduino/CDBMS_UNO_DisplayBridge/CDBMS_UNO_DisplayBridge.ino).
3. Connect your Arduino Uno by USB.
4. In Arduino IDE, select:
   - Board: `Arduino Uno`
   - Port: your COM port
5. Click Upload.

## Step 2: Start your project

Backend:

```powershell
cd "C:\Users\Nisha Ali\Desktop\project practice\backend"
npm run dev
```

Frontend:

```powershell
cd "C:\Users\Nisha Ali\Desktop\project practice\react-frontend"
npm run dev
```

## Step 3: Open the display client

Open this in **Chrome or Edge**:

```text
http://localhost:5173/display-simulator.html?apiBase=http://localhost:5000/api
```

The display page now loads your billboards automatically in a dropdown.
When you select one, it auto-fills:

- `billboardId`
- `device token`
- `device label`

You can also still open the ready-made screen URL from **Admin > Billboards > Live Display > Open Screen**.

## Step 4: Connect Arduino from the page

1. In the display page, click `Connect Arduino (USB)`.
2. Choose the Arduino COM port.
3. The page will keep polling your server every 3 seconds.
4. The page also sends a heartbeat back to the backend so the admin can see whether the browser display and Arduino bridge are online.
5. When an ad becomes active for that billboard:
   - the ad appears on the screen
   - the Arduino built-in LED stays ON
6. When nothing is scheduled:
   - the page shows idle state
   - the Arduino LED blinks

## How automatic fetching works now

The display page first loads available billboards from:

```text
GET /api/hardware/registry
```

Then it calls:

```text
GET /api/display/current?billboardId=YOUR_BILLBOARD_ID&token=YOUR_DEVICE_TOKEN
```

The backend checks today's approved and paid bookings for that billboard and returns the ad that matches the current time slot.

The display page also reports hardware status through:

```text
POST /api/hardware/heartbeat/YOUR_BILLBOARD_ID?token=YOUR_DEVICE_TOKEN
```

## If your teacher wants fully standalone hardware later

For direct server fetching without a laptop browser, you will need at least one of these:

- ESP32 + TFT display
- ESP8266 + display
- Arduino Ethernet shield + external display hardware
- Raspberry Pi connected to a monitor

If you want, I can build the **next version for ESP32** after this one.
