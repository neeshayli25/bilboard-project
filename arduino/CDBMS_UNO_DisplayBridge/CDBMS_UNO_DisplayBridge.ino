/*
  CDBMS UNO Display Bridge

  Important:
  Arduino Uno cannot fetch billboard ads from the internet by itself.
  This sketch works with the CDBMS display-simulator page running on a laptop/PC.

  Flow:
  1. Browser page polls your server for the current ad.
  2. Browser sends simple serial commands to the Uno over USB.
  3. Uno shows hardware state using the built-in LED and Serial Monitor.

  Commands received from browser:
  STATE:ACTIVE
  STATE:IDLE
  SCREEN:SCR-123ABC
  BILLBOARD:DHA Main Screen
  BOOKING:6801abc123
  TITLE:Some ad title
  DURATION:30
  SLOT:10:00 AM - 11:00 AM
  END
*/

const int STATUS_LED_PIN = LED_BUILTIN;

String currentState = "IDLE";
String currentScreenCode = "NO_SCREEN";
String currentBillboard = "No billboard";
String currentBooking = "NONE";
String currentTitle = "No ad";
String currentSlot = "";
int currentDuration = 30;

unsigned long lastBlinkAt = 0;
bool ledState = false;

void setup() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.begin(115200);
  while (!Serial) {
    ; // wait for USB serial on supported boards
  }

  Serial.println("CDBMS_UNO_READY");
  Serial.println("Waiting for serial commands from display-simulator.html");
}

void loop() {
  readSerialCommands();
  updateStatusLed();
}

void readSerialCommands() {
  if (!Serial.available()) {
    return;
  }

  String line = Serial.readStringUntil('\n');
  line.trim();

  if (line.length() == 0) {
    return;
  }

  handleCommand(line);
}

void handleCommand(const String& line) {
  if (line == "PING") {
    Serial.println("PONG");
    return;
  }

  if (line.startsWith("STATE:")) {
    currentState = line.substring(6);
    Serial.print("STATE_UPDATED:");
    Serial.println(currentState);
    return;
  }

  if (line.startsWith("SCREEN:")) {
    currentScreenCode = line.substring(7);
    Serial.print("SCREEN_UPDATED:");
    Serial.println(currentScreenCode);
    return;
  }

  if (line.startsWith("BILLBOARD:")) {
    currentBillboard = line.substring(10);
    Serial.print("BILLBOARD_UPDATED:");
    Serial.println(currentBillboard);
    return;
  }

  if (line.startsWith("BOOKING:")) {
    currentBooking = line.substring(8);
    Serial.print("BOOKING_UPDATED:");
    Serial.println(currentBooking);
    return;
  }

  if (line.startsWith("TITLE:")) {
    currentTitle = line.substring(6);
    Serial.print("TITLE_UPDATED:");
    Serial.println(currentTitle);
    return;
  }

  if (line.startsWith("DURATION:")) {
    currentDuration = line.substring(9).toInt();
    Serial.print("DURATION_UPDATED:");
    Serial.println(currentDuration);
    return;
  }

  if (line.startsWith("SLOT:")) {
    currentSlot = line.substring(5);
    Serial.print("SLOT_UPDATED:");
    Serial.println(currentSlot);
    return;
  }

  if (line == "END") {
    Serial.println("DISPLAY_PAYLOAD_RECEIVED");
    Serial.print("SCREEN_CODE:");
    Serial.println(currentScreenCode);
    Serial.print("BILLBOARD_NAME:");
    Serial.println(currentBillboard);
    Serial.print("BOOKING_ID:");
    Serial.println(currentBooking);
    Serial.print("NOW_SHOWING:");
    Serial.println(currentTitle);
    Serial.print("TIME_SLOT:");
    Serial.println(currentSlot);
    Serial.print("SECONDS:");
    Serial.println(currentDuration);
  }
}

void updateStatusLed() {
  if (currentState == "ACTIVE") {
    digitalWrite(STATUS_LED_PIN, HIGH);
    return;
  }

  unsigned long interval = 700;
  if (millis() - lastBlinkAt < interval) {
    return;
  }

  lastBlinkAt = millis();
  ledState = !ledState;
  digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
}
