# SmartMix IOT CMMS

Customer handoff documentation for installation, setup, and daily use.

This project contains:
- `backend/`: Django REST API + SQLite database
- `frontend/`: React dashboard (Vite + TypeScript)
- ESP32 firmware for Arduino IDE (provided below)

## 1. Applications To Install

Install these on the customer PC/laptop.

1. Git
2. Python 3.11 or newer
3. Node.js 18 or newer (LTS recommended)
4. Arduino IDE 2.x
5. USB driver for ESP32 board (CP210x or CH340, depending on board)

Download links:
- Git: https://git-scm.com/downloads
- Python: https://www.python.org/downloads/
- Node.js: https://nodejs.org/
- Arduino IDE: https://www.arduino.cc/en/software
- CP210x driver: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- CH340 driver: https://www.wch.cn/downloads/CH341SER_ZIP.html

## 2. Clone The Project

```bash
git clone <your-github-repo-url>
cd concrete_mixture
```

## 3. Backend Setup (Django API)

Open terminal in project root and run:

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install packages and run migrations:

```bash
pip install -r requirements.txt
python manage.py migrate
python create_sample_data.py
```

Start backend so ESP32 can reach it over network:

```bash
python manage.py runserver 0.0.0.0:8000
```

Backend URLs:
- API base: `http://<PC_LAN_IP>:8000/api/`
- Example: `http://192.168.1.100:8000/api/latest-mix/`

To find PC LAN IP on Windows:

```powershell
ipconfig
```

Use the `IPv4 Address` of the active Wi-Fi adapter.

## 4. Frontend Setup (Dashboard)

Open a second terminal in project root:

```bash
cd frontend
npm install
npm run dev -- --host
```

Dashboard URL:
- Local: `http://localhost:5173`
- LAN: `http://<PC_LAN_IP>:5173`

The frontend reads data from backend endpoint `http://localhost:8000/api` by default. If the frontend is opened on another device, update `frontend/src/services/api.ts` accordingly.

## 5. Arduino IDE Setup (Required)

The customer must use Arduino IDE for ESP32 upload.

### 5.1 Add ESP32 Board Manager URL

1. Open Arduino IDE.
2. Go to `File > Preferences`.
3. In `Additional boards manager URLs`, add:

```text
https://dl.espressif.com/dl/package_esp32_index.json
```

### 5.2 Install ESP32 Board Package

1. Go to `Tools > Board > Boards Manager`.
2. Search `esp32`.
3. Install `esp32 by Espressif Systems`.

### 5.3 Install Required Libraries

Go to `Sketch > Include Library > Manage Libraries` and install:

1. `HX711` (by Bogdan Necula)
2. `LiquidCrystal_PCF8574` (by Matthias Hertel)

Built-in ESP32 libraries already included with board package:

1. `WiFi.h`
2. `HTTPClient.h`
3. `Wire.h`

## 6. ESP32 Firmware Upload Steps

1. Open Arduino IDE.
2. Create a new sketch and paste the firmware from section `8. Arduino Code (Exact)`.
3. Update these values before upload:
   - `WIFI_SSID`
   - `WIFI_PASS`
   - `SERVER_URL` (must use your PC LAN IP and port 8000)
4. Connect ESP32 through USB.
5. Set board: `Tools > Board > ESP32 Arduino > ESP32 Dev Module` (or your exact board model).
6. Set port: `Tools > Port > COMx`.
7. Click `Verify`.
8. Click `Upload`.
9. Open Serial Monitor at `115200` baud.

Example `SERVER_URL`:

```cpp
const char* SERVER_URL = "http://192.168.1.100:8000/api/mix-data/";
```

Important network rule:
- ESP32 and backend PC must be connected to the same Wi-Fi network.

## 7. Operating Workflow (Step By Step)

1. Start backend: `python manage.py runserver 0.0.0.0:8000`.
2. Start frontend: `npm run dev -- --host`.
3. Power ESP32 and wait for Wi-Fi + server test.
4. On device, press `TARE` to zero scale.
5. Add materials in sequence and press `CONFIRM` each step:
   - CEMENT
   - WATER
   - SAND
   - GRAVEL (optional)
6. Mix the batch.
7. Device enters post-mix moisture mode.
8. Press `CONFIRM` again to send final cumulative payload including moisture.
9. Verify live update on dashboard (`latest` card + history table/chart).

## 8. Arduino Code (Exact)

Use this exact sketch in Arduino IDE:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <HX711.h>
#include <LiquidCrystal_PCF8574.h>

// ================= WIFI =================
const char* WIFI_SSID = "ChupaSups";
const char* WIFI_PASS = "qwerty1512";
const char* SERVER_URL = "http://172.20.10.3:8000/api/mix-data/";

// ================= LCD =================
LiquidCrystal_PCF8574 lcd(0x27);
static const int LCD_COLS = 20;
static const int LCD_ROWS = 4;

// ================= HX711 =================
#define DT 32
#define SCK 33
HX711 scale;
float calibration_factor = -45000.0f;

// ================= MOISTURE =================
#define MOISTURE_PIN 34

// Moisture calibration (update with your real RAW readings)
// Calibrated values (from your test)
// DRY  ~= 2875
// WET  ~= 1020
int MOISTURE_DRY_RAW = 2875;
int MOISTURE_WET_RAW = 1020;

// Moisture classification thresholds (percent)
// Your requirement:
// - DRY:        < 60%
// - ACCEPTABLE: 60%-79%
// - WET:        >= 80%
static const int MOISTURE_DRY_MAX = 60;
static const int MOISTURE_WET_MIN = 80;

// If % goes the wrong direction, set true
bool MOISTURE_INVERT = false;

// ================= BUTTON =================
#define BTN_CONFIRM 19
#define BTN_TARE 18

// ================= LEDs =================
#define LED_DRY 15
#define LED_OK 2
#define LED_WET 16

// ================= MATERIAL FLOW =================
String materialsSend[] = {"CEMENT", "WATER", "SAND", "GRAVEL"};
String materialsDisplay[] = {"CEMENT", "WATER", "SAND", "GRAVEL(OPT)"};
int stepIndex = 0;

enum RunMode {
  MODE_ADDING = 0,
  MODE_POST_MIX_MOISTURE = 1,
};

static RunMode mode = MODE_ADDING;
static float batchWeights[4] = {0, 0, 0, 0};

// ================= STATE TRACKING =================
unsigned long lastButtonPress = 0;
const unsigned long DEBOUNCE_DELAY = 300;

// ================= WEIGHT FILTERING =================
#define FILTER_SIZE 10
float weightReadings[FILTER_SIZE] = {0};
int readingIndex = 0;
bool filterInitialized = false;

// ================= TIMERS =================
static const unsigned long LCD_REFRESH_MS = 250;
static const unsigned long LOOP_DELAY_MS = 30;
unsigned long lastLcdUpdate = 0;
static const unsigned long SERIAL_REFRESH_MS = 1000;
unsigned long lastSerialUpdate = 0;

// ================= MOISTURE FILTER =================
static float moisturePctEma = NAN;

// ================= FUNCTION PROTOTYPES =================
float getFilteredWeight();
bool sendToServer(String material, float weight, int moisturePercent);
bool sendFinalBatchToServer(float cement, float water, float sand, float gravel, int moisturePercent);
void testServerConnection();

static void parseUrlHostPort(const String& url, String& host, uint16_t& port);

struct MoistureReading {
  int raw;
  int percent;
  bool valid;
};

static int clampInt(int v, int lo, int hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

static int mapClampedInt(int x, int inMin, int inMax, int outMin, int outMax) {
  if (inMin == inMax) return outMin;
  long num = (long)(x - inMin) * (long)(outMax - outMin);
  long den = (long)(inMax - inMin);
  long y = (long)outMin + (num / den);
  if (outMin < outMax) return clampInt((int)y, outMin, outMax);
  return clampInt((int)y, outMax, outMin);
}

static void parseUrlHostPort(const String& url, String& host, uint16_t& port) {
  // Supports URLs like:
  // - http://172.20.10.3:8000/api/mix-data/
  // - http://10.0.0.5/api/mix-data/
  String u = url;
  port = 80;

  int schemePos = u.indexOf("://");
  if (schemePos >= 0) {
    u = u.substring(schemePos + 3);
  }

  int pathPos = u.indexOf('/');
  String hostPort = (pathPos >= 0) ? u.substring(0, pathPos) : u;

  int colonPos = hostPort.indexOf(':');
  if (colonPos >= 0) {
    host = hostPort.substring(0, colonPos);
    String portStr = hostPort.substring(colonPos + 1);
    long p = portStr.toInt();
    if (p > 0 && p < 65536) port = (uint16_t)p;
  } else {
    host = hostPort;
  }
}

static MoistureReading readMoistureStable() {
  // 10-sample average (stability) - matches your calibrated sketch.
  // NOTE: Use ADC1 pins when WiFi is used. GPIO34 is ADC1.
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(MOISTURE_PIN);
    delay(10);
  }
  int raw = (int)(sum / 10);

  // If sensor is unplugged/floating, raw often hits rails.
  bool valid = (raw > 50 && raw < 4045);
  if (!valid) {
    return {raw, 0, false};
  }

  // Normal behavior: DRY raw > WET raw (often). We support either order.
  int dryRaw = MOISTURE_DRY_RAW;
  int wetRaw = MOISTURE_WET_RAW;

  int pct = 0;
  if (!MOISTURE_INVERT) {
    // Map dry->0, wet->100
    pct = mapClampedInt(raw, dryRaw, wetRaw, 0, 100);
  } else {
    // Map dry->100, wet->0
    pct = mapClampedInt(raw, dryRaw, wetRaw, 100, 0);
  }

  // EMA smoothing (reduces jitter)
  const float alpha = 0.18f;
  if (isnan(moisturePctEma)) moisturePctEma = (float)pct;
  else moisturePctEma = (alpha * (float)pct) + ((1.0f - alpha) * moisturePctEma);
  int pctSmooth = (int)lroundf(moisturePctEma);
  pctSmooth = clampInt(pctSmooth, 0, 100);

  return {raw, pctSmooth, true};
}

static const char* moistureStateFull(int percent, bool valid) {
  if (!valid) return "N/A";
  if (percent < MOISTURE_DRY_MAX) return "TOO DRY";
  if (percent < MOISTURE_WET_MIN) return "ACCEPTABLE";
  return "TOO WET";
}

static const char* moistureStateShort(int percent, bool valid) {
  // Short tokens that fit well on 20x4 LCD
  if (!valid) return "N/A";
  if (percent < MOISTURE_DRY_MAX) return "DRY";
  if (percent < MOISTURE_WET_MIN) return "ACC";
  return "WET";
}

float getFilteredWeight() {
  float reading = scale.get_units(5);

  weightReadings[readingIndex] = reading;
  readingIndex = (readingIndex + 1) % FILTER_SIZE;

  if (!filterInitialized && readingIndex == 0) {
    filterInitialized = true;
  }

  if (!filterInitialized) return reading;

  float sorted[FILTER_SIZE];
  memcpy(sorted, weightReadings, sizeof(weightReadings));

  for (int i = 0; i < FILTER_SIZE - 1; i++) {
    for (int j = 0; j < FILTER_SIZE - i - 1; j++) {
      if (sorted[j] > sorted[j + 1]) {
        float tmp = sorted[j];
        sorted[j] = sorted[j + 1];
        sorted[j + 1] = tmp;
      }
    }
  }

  return sorted[FILTER_SIZE / 2];
}

static void lcdPrintLine(int row, const String& text) {
  lcd.setCursor(0, row);
  String t = text;
  if ((int)t.length() > LCD_COLS) t = t.substring(0, LCD_COLS);
  lcd.print(t);
  for (int i = (int)t.length(); i < LCD_COLS; i++) lcd.print(' ');
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // ADC setup for stable range
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  pinMode(MOISTURE_PIN, INPUT);

  pinMode(BTN_CONFIRM, INPUT_PULLUP);
  pinMode(BTN_TARE, INPUT_PULLUP);

  pinMode(LED_DRY, OUTPUT);
  pinMode(LED_OK, OUTPUT);
  pinMode(LED_WET, OUTPUT);

  digitalWrite(LED_DRY, LOW);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_WET, LOW);

  Wire.begin(21, 22);
  lcd.begin(LCD_COLS, LCD_ROWS);
  lcd.setBacklight(255);

  lcd.clear();
  lcdPrintLine(0, "Concrete Monitor");
  lcdPrintLine(1, "Init...");
  delay(800);

  // HX711
  scale.begin(DT, SCK);
  scale.set_scale(calibration_factor);
  scale.set_gain(128);
  scale.tare();

  // WiFi
  lcd.clear();
  lcdPrintLine(0, "Connecting WiFi");
  lcdPrintLine(1, String(WIFI_SSID));

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    lcd.setCursor(attempts % LCD_COLS, 2);
    lcd.print('.');
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcdPrintLine(0, "WiFi FAILED");
    lcdPrintLine(1, "Restart device");
    while (1) delay(1000);
  }

  WiFi.setTxPower(WIFI_POWER_19_5dBm);

  lcd.clear();
  lcdPrintLine(0, "WiFi OK");
  lcdPrintLine(1, "IP:" + WiFi.localIP().toString());
  delay(1500);

  testServerConnection();

  // Fill weight filter buffer
  for (int i = 0; i < FILTER_SIZE * 2; i++) {
    getFilteredWeight();
    delay(40);
  }

  lcd.clear();
  lcdPrintLine(0, "READY");
  lcdPrintLine(1, "TARE=zero");
  delay(1200);

  Serial.println("\n========================================");
  Serial.println("READY! Add materials and press CONFIRM");
  Serial.println("Server URL:");
  Serial.println(SERVER_URL);
  Serial.println("========================================\n");
}

void loop() {
  unsigned long now = millis();

  // ================= POST-MIX MOISTURE MODE =================
  // Requirement: moisture should be detected AFTER all materials are added and mixed.
  if (mode == MODE_POST_MIX_MOISTURE) {
    MoistureReading m = readMoistureStable();

    // Serial debug
    if (now - lastSerialUpdate >= SERIAL_REFRESH_MS) {
      lastSerialUpdate = now;
      Serial.print("[POST-MIX] Moisture RAW=");
      Serial.print(m.raw);
      Serial.print(" PCT=");
      Serial.print(m.valid ? m.percent : 0);
      Serial.print(m.valid ? "%" : "(N/A)");
      Serial.print(" STATE=");
      Serial.println(moistureStateFull(m.percent, m.valid));
    }

    // LEDs based on moisture; if invalid, turn off
    if (!m.valid) {
      digitalWrite(LED_DRY, LOW);
      digitalWrite(LED_OK, LOW);
      digitalWrite(LED_WET, LOW);
    } else {
      digitalWrite(LED_DRY, m.percent < MOISTURE_DRY_MAX);
      digitalWrite(LED_OK, m.percent >= MOISTURE_DRY_MAX && m.percent < MOISTURE_WET_MIN);
      digitalWrite(LED_WET, m.percent >= MOISTURE_WET_MIN);
    }

    // LCD
    if (now - lastLcdUpdate >= LCD_REFRESH_MS) {
      lastLcdUpdate = now;
      lcdPrintLine(0, "MIXED? Read moisture");
      if (!m.valid) {
        lcdPrintLine(1, "M:N/A RAW:" + String(m.raw));
      } else {
        lcdPrintLine(1, "M:" + String(m.percent) + "% " + String(moistureStateShort(m.percent, m.valid)));
      }
      lcdPrintLine(2, "Press CONFIRM send");
      lcdPrintLine(3, "TARE=zero scale");
    }

    // CONFIRM sends final cumulative payload (weights + moisture)
    if (digitalRead(BTN_CONFIRM) == LOW && (now - lastButtonPress > DEBOUNCE_DELAY)) {
      lastButtonPress = now;

      lcd.clear();
      lcdPrintLine(1, "Sending final...");

      int moistureToSend = m.valid ? m.percent : 0;
      bool ok = sendFinalBatchToServer(
        batchWeights[0], batchWeights[1], batchWeights[2], batchWeights[3],
        moistureToSend
      );

      if (ok) {
        lcd.clear();
        lcdPrintLine(0, "Final sent OK");
        lcdPrintLine(1, "New batch ready");
        delay(1400);

        // Reset for next batch
        for (int i = 0; i < 4; i++) batchWeights[i] = 0;
        stepIndex = 0;
        mode = MODE_ADDING;

        // Turn off moisture LEDs until next post-mix phase
        digitalWrite(LED_DRY, LOW);
        digitalWrite(LED_OK, LOW);
        digitalWrite(LED_WET, LOW);
      } else {
        lcd.clear();
        lcdPrintLine(0, "Final send FAIL");
        lcdPrintLine(1, "Check server/WiFi");
        delay(1600);
      }
    }

    delay(LOOP_DELAY_MS);
    return;
  }

  // TARE
  if (digitalRead(BTN_TARE) == LOW && (now - lastButtonPress > DEBOUNCE_DELAY)) {
    lastButtonPress = now;

    lcd.clear();
    lcdPrintLine(1, "Taring...");
    scale.tare();

    // Reset filter
    for (int i = 0; i < FILTER_SIZE; i++) weightReadings[i] = 0;
    filterInitialized = false;
    for (int i = 0; i < FILTER_SIZE * 2; i++) {
      getFilteredWeight();
      delay(40);
    }

    lcd.clear();
    lcdPrintLine(1, "Tare OK");
    delay(800);
  }

  // Weight
  float weight = getFilteredWeight();
  if (fabs(weight) < 0.05f) weight = 0;

  // Moisture is intentionally NOT read here.
  // Requirement: detect moisture after all materials are added and mixed.
  // Keep LEDs off during adding mode.
  digitalWrite(LED_DRY, LOW);
  digitalWrite(LED_OK, LOW);
  digitalWrite(LED_WET, LOW);

  // LCD refresh (timed) to reduce flicker
  if (now - lastLcdUpdate >= LCD_REFRESH_MS) {
    lastLcdUpdate = now;

    lcdPrintLine(0, "Add:" + materialsDisplay[stepIndex] + " " + String(stepIndex + 1) + "/4");
    lcdPrintLine(1, "W:" + String(weight, 2) + "kg");
    lcdPrintLine(2, "Moisture: after mix");
    if (stepIndex == 3) lcdPrintLine(3, "CONFIRM=send/skip");
    else lcdPrintLine(3, "CONFIRM to send");
  }

  // CONFIRM
  if (digitalRead(BTN_CONFIRM) == LOW && (now - lastButtonPress > DEBOUNCE_DELAY)) {
    lastButtonPress = now;

    // Stability check (3 samples)
    lcd.clear();
    lcdPrintLine(1, "Stabilizing...");

    float w1 = getFilteredWeight(); delay(200);
    float w2 = getFilteredWeight(); delay(200);
    float w3 = getFilteredWeight();

    float avg = (w1 + w2 + w3) / 3.0f;
    float diff1 = fabs(w1 - avg);
    float diff2 = fabs(w2 - avg);
    float diff3 = fabs(w3 - avg);
    float maxDiff = max(diff1, max(diff2, diff3));

    if (maxDiff > 0.3f) {
      lcd.clear();
      lcdPrintLine(0, "Unstable weight");
      lcdPrintLine(1, "Try again");
      delay(1500);
      return;
    }

    // ===== GRAVEL OPTIONAL LOGIC =====
    if (stepIndex == 3 && avg <= 0.1f) {
      lcd.clear();
      lcdPrintLine(0, "Gravel skipped");
      lcdPrintLine(1, "Now MIX then CONFIRM");
      delay(1600);

      batchWeights[3] = 0;
      mode = MODE_POST_MIX_MOISTURE;
      return;
    }

    // Required steps must have weight
    if (avg <= 0.1f) {
      lcd.clear();
      lcdPrintLine(1, "No weight!");
      delay(1200);
      return;
    }

    lcd.clear();
    lcdPrintLine(1, "Sending...");

    // During adding mode, we send moisture=0. Moisture is sent only after mixing.
    bool ok = sendToServer(materialsSend[stepIndex], avg, 0);

    if (ok) {
      batchWeights[stepIndex] = avg;

      // If this was the final material step, go to post-mix moisture mode.
      if (stepIndex == 3) {
        lcd.clear();
        lcdPrintLine(0, "Materials done");
        lcdPrintLine(1, "MIX then CONFIRM");
        delay(1600);

        mode = MODE_POST_MIX_MOISTURE;
        return;
      }

      stepIndex++;

      lcd.clear();
      lcdPrintLine(1, "Sent OK");
      delay(900);
    } else {
      lcd.clear();
      lcdPrintLine(1, "Send FAILED");
      delay(1500);
    }
  }

  delay(LOOP_DELAY_MS);
}

bool sendFinalBatchToServer(float cement, float water, float sand, float gravel, int moisturePercent) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(3000);
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  // Cumulative payload (backend supports this format)
  String payload = "{";
  payload += "\"cement_weight\":" + String(cement, 2) + ",";
  payload += "\"water_weight\":" + String(water, 2) + ",";
  payload += "\"sand_weight\":" + String(sand, 2) + ",";
  payload += "\"gravel_weight\":" + String(gravel, 2) + ",";
  payload += "\"moisture\":" + String(moisturePercent);
  payload += "}";

  Serial.println("POST (FINAL) " + String(SERVER_URL));
  Serial.println("Payload: " + payload);

  int code = http.POST(payload);
  String body = http.getString();

  if (code < 0) {
    Serial.print("HTTP ERROR: ");
    Serial.println(http.errorToString(code));
  }

  http.end();

  Serial.print("HTTP ");
  Serial.println(code);
  if (body.length()) Serial.println(body);

  return (code == 200 || code == 201);
}

bool sendToServer(String material, float weight, int moisturePercent) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(3000);
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  String payload = "{";
  payload += "\"material\":\"" + material + "\",";
  payload += "\"weight\":" + String(weight, 2) + ",";
  payload += "\"moisture\":" + String(moisturePercent);
  payload += "}";

  Serial.println("POST " + String(SERVER_URL));
  Serial.println("Payload: " + payload);

  int code = http.POST(payload);
  String body = http.getString();

  if (code < 0) {
    Serial.print("HTTP ERROR: ");
    Serial.println(http.errorToString(code));
  }

  http.end();

  Serial.print("HTTP ");
  Serial.println(code);
  if (body.length()) Serial.println(body);

  return (code == 200 || code == 201);
}

void testServerConnection() {
  HTTPClient http;
  // Build test URL safely (avoids false FAIL when SERVER_URL doesn't exactly match)
  // Example SERVER_URL: http://172.20.10.3:8000/api/mix-data/
  // Test URL:          http://172.20.10.3:8000/api/latest-mix/
  String base = String(SERVER_URL);
  int apiPos = base.indexOf("/api/");
  if (apiPos >= 0) {
    base = base.substring(0, apiPos);
  }
  String testUrl = base + "/api/latest-mix/";

  // Quick TCP test first: distinguishes "server down/firewall/wrong IP" from HTTP-level issues.
  String host;
  uint16_t port = 80;
  parseUrlHostPort(String(SERVER_URL), host, port);
  WiFiClient client;
  client.setTimeout(2000);

  lcd.clear();
  lcdPrintLine(0, "Testing server");

  if (!client.connect(host.c_str(), port)) {
    Serial.print("[TEST] TCP connect FAIL to ");
    Serial.print(host);
    Serial.print(":");
    Serial.println(port);
    lcdPrintLine(1, "TCP FAIL");
    lcdPrintLine(2, host + ":" + String(port));
    delay(1200);
    return;
  }
  client.stop();

  http.begin(testUrl);
  http.setTimeout(5000);
  int code = http.GET();
  String body = http.getString();

  String err;
  if (code < 0) {
    err = http.errorToString(code);
    Serial.print("[TEST] HTTP ERROR: ");
    Serial.println(err);
  }

  http.end();

  Serial.print("[TEST] GET ");
  Serial.println(testUrl);
  Serial.print("[TEST] HTTP ");
  Serial.println(code);
  if (body.length()) {
    Serial.println("[TEST] BODY:");
    Serial.println(body);
  }

  lcdPrintLine(1, "HTTP:" + String(code));
  // Consider redirects as reachable (common with missing/extra slash)
  if (code >= 200 && code < 400) {
    lcdPrintLine(2, "Server OK");
  } else if (code < 0) {
    // Shorten the error text to fit 20 chars
    if (err.length() > 20) err = err.substring(0, 20);
    lcdPrintLine(2, err);
  } else {
    lcdPrintLine(2, "Server FAIL");
  }
  delay(1200);
}
```

## 9. API Endpoints Used

- `POST /api/mix-data/`
  - Incremental mode payload:

```json
{ "material": "CEMENT", "weight": 50.5, "moisture": 0 }
```

  - Final cumulative payload:

```json
{
  "cement_weight": 50.5,
  "water_weight": 22.5,
  "sand_weight": 75.0,
  "gravel_weight": 100.0,
  "moisture": 68
}
```

- `GET /api/latest-mix/`
- `GET /api/mix-history/?limit=50`

## 10. Troubleshooting Checklist

1. ESP32 cannot connect to backend:
   - Confirm `SERVER_URL` uses PC LAN IP, not `localhost`.
   - Confirm backend is running on `0.0.0.0:8000`.
   - Allow Python through Windows Firewall.
2. Frontend has no data:
   - Confirm backend is running.
   - Check API in browser: `http://localhost:8000/api/latest-mix/`.
3. Upload fails in Arduino IDE:
   - Hold `BOOT` button while upload starts (some ESP32 boards).
   - Install correct USB driver (CP210x/CH340).
4. Moisture value incorrect:
   - Recalibrate `MOISTURE_DRY_RAW` and `MOISTURE_WET_RAW`.
   - Toggle `MOISTURE_INVERT` if direction is reversed.

## 11. Before Pushing To GitHub

For security, do not keep real Wi-Fi credentials in public code.

In the Arduino sketch, replace with placeholders before public push:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
```

Then keep actual credentials only on the customer machine.

1. Visit `http://localhost:8000/admin`
2. Login with your superuser credentials
3. View and manage mix batches directly

### Project Structure

```
concrete_mixture/
├── backend/               # Django REST API
│   ├── backend/          # Project settings
│   │   ├── settings.py   # Configuration (CORS, REST, etc.)
│   │   └── urls.py       # URL routing
│   ├── core/             # Main app
│   │   ├── models.py     # MixBatch model
│   │   ├── serializers.py # REST serializers
│   │   ├── views.py      # API endpoints
│   │   ├── urls.py       # API routes
│   │   └── admin.py      # Admin configuration
│   ├── manage.py         # Django management
│   ├── requirements.txt  # Python dependencies
│   └── create_sample_data.py # Sample data generator
│
└── frontend/             # React dashboard
    ├── src/
    │   ├── components/   # React components
    │   │   └── dashboard/
    │   │       ├── MixStatusCard.tsx
    │   │       ├── SensorValuesGrid.tsx
    │   │       ├── MixHistoryTable.tsx
    │   │       └── WCRatioChart.tsx
    │   ├── hooks/        # Custom hooks
    │   │   └── useMixData.ts # Auto-refresh data hook
    │   ├── services/     # API client
    │   │   └── api.ts
    │   ├── types/        # TypeScript types
    │   │   └── concrete.ts
    │   └── pages/        # Page components
    │       └── Index.tsx
    └── package.json
```

## 📱 Dashboard Features

### Current Mix Status Card
- Shows real-time mix quality status
- Large W/C ratio display
- Color-coded background
- Status description
- Last reading timestamp

### Live Sensor Values
- Four sensor cards (Cement, Water, Sand, Gravel)
- Icon and color-coded design
- Real-time weight updates
- Material descriptions

### W/C Ratio Chart
- Line chart showing ratio trend over time
- Reference lines for thresholds
- Interactive tooltips
- Historical pattern analysis

### Mix History Table
- Scrollable table of all batches
- Sortable columns
- Status badges
- Detailed weight information

## 🔧 Configuration

### Backend (Django)

**Change API Port:**
Edit in `backend/backend/settings.py`:
```python
# In terminal:
python manage.py runserver 0.0.0.0:8080
```

**CORS Settings:**
Edit `backend/backend/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://192.168.1.100:8080",  # Add your device IP
]
```

### Frontend (React)

**Change API URL:**
Edit `frontend/src/services/api.ts`:
```typescript
const API_BASE_URL = "http://localhost:8000/api";
// Change to your backend IP if needed
```

**Change Refresh Interval:**
Edit `frontend/src/hooks/useMixData.ts`:
```typescript
const REFRESH_INTERVAL = 5000; // milliseconds
```

## 📖 Research & Thesis Use

This system is ideal for:
- Civil Engineering IoT projects
- Concrete quality monitoring research
- Smart construction thesis work
- Educational demonstrations
- Industry 4.0 applications

### Recommended Enhancements for Thesis:
1. Add temperature and humidity sensors
2. Implement machine learning for strength prediction
3. Add mobile app with push notifications
4. Create PDF report generation
5. Add user authentication
6. Implement data export (CSV/Excel)
7. Add multiple mixer support
8. Implement alert thresholds

## 🐛 Troubleshooting

### Backend Issues

**"Module not found" errors:**
```bash
pip install -r requirements.txt
```

**Database errors:**
```bash
python manage.py migrate --run-syncdb
```

**Port already in use:**
```bash
python manage.py runserver 8001
```

### Frontend Issues

**Connection errors:**
- Check if backend is running at `http://localhost:8000`
- Verify CORS settings in Django
- Check browser console for errors

**"Cannot find module" errors:**
```bash
npm install
```

**Build errors:**
```bash
rm -rf node_modules
npm install
```

## 📄 License

This project is created for educational and research purposes. Feel free to use and modify for your thesis or projects.

## 👨‍💻 Author

Created for Sensor-Based Concrete Mix Monitoring Thesis Project

## 🙏 Acknowledgments

- Django & Django REST Framework
- React & TypeScript
- Recharts for data visualization
- shadcn/ui for UI components
- Tailwind CSS for styling

---

**Need Help?** Check the inline code comments - every file is thoroughly documented for beginners!
