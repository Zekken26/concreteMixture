# 📡 ESP32 Setup Guide for Concrete Mix Monitoring

This guide will help you connect ESP32 with load cell sensors (HX711) to send data to the Django backend.

## 🔧 Hardware Requirements

### Components Needed:
1. **ESP32 Development Board** (e.g., ESP32-WROOM-32)
2. **4x HX711 Load Cell Amplifier Modules**
3. **4x Load Cells** (50kg or 100kg recommended)
4. **Jumper Wires**
5. **Breadboard** (optional for prototyping)
6. **Power Supply** (5V, 2A recommended)

### Load Cell Connection Diagram:

```
Load Cell → HX711 Module → ESP32
─────────────────────────────────
Red wire    → E+
Black wire  → E-
White wire  → A-
Green wire  → A+

HX711 Pins:
VCC → 3.3V (ESP32)
GND → GND (ESP32)
DT  → GPIO Pin (Data)
SCK → GPIO Pin (Clock)
```

## 📋 Wiring Diagram

### Cement Load Cell (HX711 #1)
```
HX711 VCC → ESP32 3.3V
HX711 GND → ESP32 GND
HX711 DT  → ESP32 GPIO 16 (D1)
HX711 SCK → ESP32 GPIO 17 (D2)
```

### Water Load Cell (HX711 #2)
```
HX711 VCC → ESP32 3.3V
HX711 GND → ESP32 GND
HX711 DT  → ESP32 GPIO 18 (D3)
HX711 SCK → ESP32 GPIO 19 (D4)
```

### Sand Load Cell (HX711 #3)
```
HX711 VCC → ESP32 3.3V
HX711 GND → ESP32 GND
HX711 DT  → ESP32 GPIO 21 (D5)
HX711 SCK → ESP32 GPIO 22 (D6)
```

### Gravel Load Cell (HX711 #4)
```
HX711 VCC → ESP32 3.3V
HX711 GND → ESP32 GND
HX711 DT  → ESP32 GPIO 23 (D7)
HX711 SCK → ESP32 GPIO 25 (D8)
```

## 💻 Arduino IDE Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Add ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search "esp32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
Go to **Sketch → Include Library → Manage Libraries**, then install:
- **HX711 Arduino Library** by Bogdan Necula
- **HTTPClient** (built-in with ESP32)
- **WiFi** (built-in with ESP32)
- **ArduinoJson** by Benoit Blanchon (optional but recommended)

## 📝 Arduino Code

The workspace now includes a ready-to-upload firmware sketch with **improved moisture stability** and an LCD display:

- Sketch: [esp32_firmware/ConcreteMixMonitor/ConcreteMixMonitor.ino](esp32_firmware/ConcreteMixMonitor/ConcreteMixMonitor.ino)
- Firmware notes: [esp32_firmware/README.md](esp32_firmware/README.md)

To make the moisture % accurate, open Serial Monitor @ 115200 and note the moisture sensor `raw` value when the probe is:
- completely **dry** → set `MOISTURE_DRY_RAW`
- completely **wet** → set `MOISTURE_WET_RAW`

### Complete ESP32 Code with Load Cells

```cpp
/**
 * ESP32 Concrete Mix Monitoring System
 * 
 * Reads data from 4 load cells (HX711) and sends to Django API
 * 
 * Hardware:
 * - ESP32 Development Board
 * - 4x HX711 Load Cell Amplifier
 * - 4x Load Cells
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"

// ========== CONFIGURATION ==========

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";          // Change this
const char* password = "YOUR_WIFI_PASSWORD";  // Change this

// API Endpoint
const char* serverUrl = "http://192.168.1.100:8000/api/mix-data/";  // Change to your computer's IP

// HX711 Pins for Cement Scale
const int CEMENT_DOUT = 16;
const int CEMENT_SCK = 17;

// HX711 Pins for Water Scale
const int WATER_DOUT = 18;
const int WATER_SCK = 19;

// HX711 Pins for Sand Scale
const int SAND_DOUT = 21;
const int SAND_SCK = 22;

// HX711 Pins for Gravel Scale
const int GRAVEL_DOUT = 23;
const int GRAVEL_SCK = 25;

// Calibration factors (adjust these for your load cells)
const float CEMENT_CALIBRATION = 2280.0;
const float WATER_CALIBRATION = 2280.0;
const float SAND_CALIBRATION = 2280.0;
const float GRAVEL_CALIBRATION = 2280.0;

// Send interval (milliseconds)
const unsigned long SEND_INTERVAL = 5000; // 5 seconds

// ========== GLOBAL VARIABLES ==========

HX711 scale_cement;
HX711 scale_water;
HX711 scale_sand;
HX711 scale_gravel;

unsigned long lastSendTime = 0;

// ========== SETUP ==========

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("========================================");
  Serial.println("ESP32 Concrete Mix Monitoring System");
  Serial.println("========================================");
  
  // Initialize load cells
  Serial.println("\n[1/3] Initializing load cells...");
  
  scale_cement.begin(CEMENT_DOUT, CEMENT_SCK);
  scale_water.begin(WATER_DOUT, WATER_SCK);
  scale_sand.begin(SAND_DOUT, SAND_SCK);
  scale_gravel.begin(GRAVEL_DOUT, GRAVEL_SCK);
  
  // Set calibration factors
  scale_cement.set_scale(CEMENT_CALIBRATION);
  scale_water.set_scale(WATER_CALIBRATION);
  scale_sand.set_scale(SAND_CALIBRATION);
  scale_gravel.set_scale(GRAVEL_CALIBRATION);
  
  // Tare all scales (reset to zero)
  Serial.println("Taring scales... (Remove all weights!)");
  scale_cement.tare();
  scale_water.tare();
  scale_sand.tare();
  scale_gravel.tare();
  
  Serial.println("✓ Load cells initialized");
  
  // Connect to WiFi
  Serial.println("\n[2/3] Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    delay(500);
    Serial.print(".");
    attempt++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Please check your credentials and try again.");
  }
  
  Serial.println("\n[3/3] System ready!");
  Serial.println("========================================\n");
}

// ========== MAIN LOOP ==========

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to send data
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    
    // Read weights from all load cells
    float cement = scale_cement.get_units(5);   // Average of 5 readings
    float water = scale_water.get_units(5);
    float sand = scale_sand.get_units(5);
    float gravel = scale_gravel.get_units(5);
    
    // Ensure non-negative values
    cement = max(0.0f, cement);
    water = max(0.0f, water);
    sand = max(0.0f, sand);
    gravel = max(0.0f, gravel);
    
    // Print readings to serial monitor
    Serial.println("─────────────────────────────────────");
    Serial.println("📊 Sensor Readings:");
    Serial.printf("   Cement:  %.2f kg\n", cement);
    Serial.printf("   Water:   %.2f kg\n", water);
    Serial.printf("   Sand:    %.2f kg\n", sand);
    Serial.printf("   Gravel:  %.2f kg\n", gravel);
    Serial.printf("   W/C Ratio: %.2f\n", (cement > 0) ? (water / cement) : 0.0f);
    
    // Send data to API
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToAPI(cement, water, sand, gravel);
    } else {
      Serial.println("✗ WiFi not connected. Skipping API call.");
      // Try to reconnect
      WiFi.begin(ssid, password);
    }
    
    Serial.println("─────────────────────────────────────\n");
  }
  
  delay(100); // Small delay to prevent overwhelming the CPU
}

// ========== FUNCTIONS ==========

/**
 * Send sensor data to Django API
 */
void sendDataToAPI(float cement, float water, float sand, float gravel) {
  HTTPClient http;
  
  // Begin HTTP connection
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonData = "{";
  jsonData += "\"cement_weight\":" + String(cement, 2) + ",";
  jsonData += "\"water_weight\":" + String(water, 2) + ",";
  jsonData += "\"sand_weight\":" + String(sand, 2) + ",";
  jsonData += "\"gravel_weight\":" + String(gravel, 2);
  jsonData += "}";
  
  Serial.println("📤 Sending data to API...");
  Serial.println("   Payload: " + jsonData);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonData);
  
  // Check response
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✓ Data sent successfully!");
    Serial.println("   Response code: " + String(httpResponseCode));
    Serial.println("   Response: " + response);
  } else {
    Serial.println("✗ Error sending data");
    Serial.println("   Error code: " + String(httpResponseCode));
  }
  
  // Close connection
  http.end();
}
```

## 🔧 Calibration Guide

### Step 1: Tare (Zero) the Scales
1. Remove all weights from the load cells
2. Upload the code to ESP32
3. Wait for "Taring scales..." message
4. All scales are now zeroed

### Step 2: Find Calibration Factor
1. Place a known weight (e.g., 1kg) on each load cell
2. Use this calibration code:

```cpp
void loop() {
  Serial.print("Cement raw: ");
  Serial.println(scale_cement.get_units(10));
  
  // If reading shows 2280 for 1kg, your calibration factor is 2280
  delay(1000);
}
```

3. Calculate: `Calibration Factor = Raw Reading / Known Weight`
4. Update the calibration constants in the main code

### Step 3: Test Accuracy
1. Place known weights on each scale
2. Verify readings in Serial Monitor
3. Adjust calibration factors if needed

## 🌐 Finding Your Computer's IP Address

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

### Mac/Linux:
```bash
ifconfig
```
Look for "inet" address (e.g., 192.168.1.100)

### Update in ESP32 Code:
```cpp
const char* serverUrl = "http://YOUR_IP_HERE:8000/api/mix-data/";
```

## 🐛 Troubleshooting

### LCD shows "ACCEPTABLE" even when moisture is 0%
In this project, **ACCEPTABLE / TOO DRY / TOO WET** is normally the **mix status based on W/C ratio** (water ÷ cement). It will still show **ACCEPTABLE** even if the moisture sensor reads 0%.

If you want the LCD to reflect moisture, display moisture separately (recommended), or change your firmware to classify moisture (e.g., DRY/OK/WET) and print that label instead of the W/C status.

Also, if the moisture sensor is unplugged, the ESP32 ADC pin can "float" and produce a mid-range value (often mapping to an "OK/ACCEPTABLE" band). In that case, add a pull-down resistor in hardware or detect invalid raw values in firmware and show `N/A`.

### WiFi Connection Issues
- Check SSID and password
- Ensure ESP32 is in range
- Try 2.4GHz WiFi (ESP32 doesn't support 5GHz)

### Load Cell Not Reading
- Check wiring connections
- Verify HX711 power (3.3V)
- Ensure load cell wires are correct (Red/Black/White/Green)

### API Connection Failed
- Verify Django server is running
- Check computer firewall settings
- Ensure ESP32 and computer are on same network
- Test API with browser: http://YOUR_IP:8000/api/mix-history/

Tip: The included firmware sketch shows the **HTTP status code** on the LCD during server test (for example `HTTP:200`, `HTTP:404`, `HTTP:-1`). This makes it much easier to identify whether the issue is firewall/timeout, wrong URL/path, or a redirect.

### Negative Readings
- Tare the scales again
- Check calibration factors
- Ensure load cells are properly mounted

## 📊 Testing Without Hardware

Use this simplified code for WiFi testing:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://192.168.1.100:8000/api/mix-data/";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Test data
  String json = "{\"cement_weight\":50.0,\"water_weight\":22.5,\"sand_weight\":75.0,\"gravel_weight\":100.0}";
  
  int code = http.POST(json);
  Serial.println("Response: " + String(code));
  
  http.end();
  delay(5000);
}
```

## 📚 Additional Resources

- **ESP32 Documentation**: https://docs.espressif.com/projects/esp-idf/
- **HX711 Library**: https://github.com/bogde/HX711
- **Load Cell Guide**: Search "HX711 load cell tutorial"
- **WiFi Troubleshooting**: https://randomnerdtutorials.com/esp32-wifi/

## 🎓 Tips for Thesis

1. **Document Everything**: Take photos of your setup
2. **Log Data**: Save sensor readings to SD card
3. **Add LCD Display**: Show readings locally
4. **Battery Power**: Use LiPo battery for portability
5. **Enclosure**: 3D print a protective case
6. **Multiple Units**: Deploy several ESP32s for comparison

---

**Need help?** Check serial monitor output for detailed debugging information!
