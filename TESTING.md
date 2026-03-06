# 🧪 Testing & Validation Guide

This guide helps you verify that all components of your IoT Concrete Mix Monitoring System are working correctly.

## ✅ Backend API Tests

### 1. Test Server is Running

```bash
curl http://localhost:8000/api/mix-history/
```

**Expected Response:**
- Status: 200 OK
- JSON response with list of mix batches

### 2. Test Latest Mix Endpoint

```bash
curl http://localhost:8000/api/latest-mix/
```

**Expected Response:**
```json
{
  "message": "Latest mix batch retrieved successfully",
  "data": {
    "id": 1,
    "cement_weight": 50.5,
    "water_weight": 22.5,
    "sand_weight": 75.0,
    "gravel_weight": 100.0,
    "wc_ratio": 0.45,
    "status": "excellent",
    "timestamp": "2026-01-24T00:42:15.123456Z"
  }
}
```

### 3. Test Creating New Mix Batch

**Using curl:**
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{
    "cement_weight": 48.5,
    "water_weight": 24.0,
    "sand_weight": 72.0,
    "gravel_weight": 96.0
  }'
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/mix-data/ `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"cement_weight":48.5,"water_weight":24.0,"sand_weight":72.0,"gravel_weight":96.0}'
```

**Expected Response:**
- Status: 201 Created
- JSON with created batch data
- W/C ratio automatically calculated (should be ~0.49)
- Status automatically determined (should be "good")

### 4. Test Status Classification

Send batches with different W/C ratios:

**Too Dry (W/C = 0.40):**
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":50.0,"water_weight":20.0,"sand_weight":75.0,"gravel_weight":100.0}'
```
Expected status: "too_dry"

**Acceptable (W/C = 0.50):**
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":50.0,"water_weight":25.0,"sand_weight":75.0,"gravel_weight":100.0}'
```
Expected status: "acceptable"

**Too Wet (W/C = 0.65):**
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":50.0,"water_weight":30.0,"sand_weight":75.0,"gravel_weight":100.0}'
```
Expected status: "fair"

**Poor (W/C = 0.70):**
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":50.0,"water_weight":35.0,"sand_weight":75.0,"gravel_weight":100.0}'
```
Expected status: "poor"

### 5. Test History with Limit

```bash
curl http://localhost:8000/api/mix-history/?limit=5
```

**Expected:**
- Returns maximum of 5 most recent batches

## 🎨 Frontend Dashboard Tests

### 1. Visual Inspection Checklist

Open `http://localhost:8080` and verify:

- [ ] **Dashboard Header**
  - Shows "Concrete Mix Monitoring System"
  - Shows last updated time
  - Shows connection status (green dot = connected)

- [ ] **Current Mix Status Card**
  - Large status indicator (EXCELLENT/GOOD/FAIR/POOR)
  - Color matches status (Green/Blue/Yellow/Red)
  - Large W/C ratio number
  - Last reading timestamp

- [ ] **Sensor Values Grid**
  - 4 cards: Cement, Water, Sand, Gravel
  - Each shows icon, label, value in kg
  - Values update when refreshing

- [ ] **W/C Ratio Chart**
  - Line chart with data points
  - Reference lines at 0.45 and 0.55
  - X-axis shows timestamps
  - Y-axis shows W/C ratio (0.3 to 0.7)
  - Tooltips appear on hover

- [ ] **Mix History Table**
  - Scrollable table with batches
  - Columns: Date/Time, Cement, Water, Sand, Gravel, W/C Ratio, Status
  - Status badges are color-coded
  - Most recent batch at top

### 2. Auto-Refresh Test

1. Open dashboard at `http://localhost:8080`
2. Note the "Last Updated" time
3. Wait 5 seconds
4. Verify:
   - [ ] Last updated time changes
   - [ ] Data refreshes automatically
   - [ ] No page reload required

### 3. Responsive Design Test

#### Desktop (> 1024px)
- [ ] 4 sensor cards in single row
- [ ] Chart and table side by side
- [ ] All text readable
- [ ] No horizontal scrolling

#### Tablet (768px - 1024px)
- [ ] 2 sensor cards per row
- [ ] Chart and table stacked
- [ ] Touch-friendly buttons
- [ ] All features accessible

#### Mobile (< 768px)
- [ ] 2 sensor cards per row
- [ ] All components stacked vertically
- [ ] Table scrolls horizontally if needed
- [ ] Text is readable without zooming

### 4. Error Handling Test

#### Test Offline Mode:
1. Stop Django backend (Ctrl+C)
2. Refresh frontend
3. Verify:
   - [ ] Shows "Backend unavailable" message
   - [ ] Displays error message
   - [ ] Status indicator shows "disconnected" (red dot)
   - [ ] Shows empty state or loading indicators

#### Test Recovery:
1. Restart Django backend
2. Wait for auto-refresh (5 seconds)
3. Verify:
   - [ ] Connects automatically
   - [ ] Shows real data
   - [ ] Status indicator turns green

## 🔌 ESP32 Integration Tests

### 1. WiFi Connection Test

Upload this simple test code to ESP32:

```cpp
#include <WiFi.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConnected!");
  Serial.println(WiFi.localIP());
}

void loop() {}
```

**Expected:**
- Serial monitor shows dots while connecting
- Prints "Connected!" and IP address

### 2. API Connection Test

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://192.168.1.100:8000/api/mix-history/";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  HTTPClient http;
  http.begin(serverUrl);
  int httpCode = http.GET();
  
  Serial.println("Response code: " + String(httpCode));
  Serial.println(http.getString());
  
  http.end();
}

void loop() {}
```

**Expected:**
- Response code: 200
- JSON data printed to serial monitor

### 3. Data Sending Test

Use the full ESP32 code to send test data:

**Expected Behavior:**
1. ESP32 connects to WiFi
2. Sends data every 5 seconds
3. Django logs show POST requests: `"POST /api/mix-data/ HTTP/1.1" 201`
4. Frontend updates with new data
5. Serial monitor shows "Data sent successfully!"

## 📊 Performance Tests

### 1. Load Test - Multiple Batches

Create 100 sample batches:

```python
# In Django shell: python manage.py shell
from core.models import MixBatch
import random
from datetime import datetime, timedelta

for i in range(100):
    MixBatch.objects.create(
        cement_weight=50 + random.uniform(-5, 5),
        water_weight=25 + random.uniform(-3, 3),
        sand_weight=75 + random.uniform(-8, 8),
        gravel_weight=100 + random.uniform(-10, 10),
        wc_ratio=0,
        timestamp=datetime.now() - timedelta(hours=i)
    )
```

**Expected:**
- [ ] API responds in < 1 second
- [ ] Frontend renders all data
- [ ] Table is scrollable
- [ ] Chart shows trends
- [ ] No browser lag

### 2. Concurrent Requests Test

```bash
# Send 10 requests simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/mix-data/ \
    -H "Content-Type: application/json" \
    -d '{"cement_weight":50.0,"water_weight":25.0,"sand_weight":75.0,"gravel_weight":100.0}' &
done
```

**Expected:**
- [ ] All requests succeed
- [ ] All batches created
- [ ] No duplicate data
- [ ] No errors in Django log

## 🛡️ Security Tests

### 1. CORS Test

From a different port (e.g., `http://localhost:3000`), try to fetch data:

```javascript
fetch('http://localhost:8000/api/latest-mix/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected:**
- Request succeeds (CORS is configured)
- No CORS errors in browser console

### 2. Input Validation Test

Try sending invalid data:

```bash
# Negative weight
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":-10,"water_weight":25.0,"sand_weight":75.0,"gravel_weight":100.0}'
```

**Expected:**
- Status: 400 Bad Request
- Error message about negative values

```bash
# Zero cement (division by zero test)
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{"cement_weight":0,"water_weight":25.0,"sand_weight":75.0,"gravel_weight":100.0}'
```

**Expected:**
- Status: 400 Bad Request
- Error message about cement weight

## 📱 Cross-Device Tests

### Test Matrix:

| Device | Browser | Resolution | Test Status |
|--------|---------|------------|-------------|
| Desktop | Chrome | 1920x1080 | [ ] Pass |
| Desktop | Firefox | 1920x1080 | [ ] Pass |
| Desktop | Edge | 1920x1080 | [ ] Pass |
| Tablet | Safari | 1024x768 | [ ] Pass |
| Phone | Chrome | 375x667 | [ ] Pass |

### What to Test on Each Device:
1. All components visible
2. No layout issues
3. Touch/click interactions work
4. Charts render correctly
5. Tables are scrollable

## 🎓 Acceptance Criteria

Your system is ready for thesis presentation if:

- [ ] Backend API responds to all endpoints
- [ ] Status classification works correctly
- [ ] Frontend displays all components
- [ ] Auto-refresh works (5 seconds)
- [ ] Responsive on mobile and desktop
- [ ] Can handle 100+ batches
- [ ] ESP32 can send data successfully
- [ ] Error handling works properly
- [ ] All code is well commented
- [ ] README documentation is complete

## 🐛 Common Issues & Solutions

### Issue: API returns 404
**Solution:** Check URL in `frontend/src/services/api.ts`

### Issue: CORS errors
**Solution:** Verify `CORS_ALLOWED_ORIGINS` in Django settings

### Issue: Data not updating
**Solution:** Check browser console and Django logs

### Issue: Chart not rendering
**Solution:** Verify recharts library is installed

### Issue: ESP32 can't connect
**Solution:** Check WiFi credentials and network settings

## 📝 Test Report Template

```
Test Date: _____________
Tester: _____________

Backend Tests:
□ Latest mix endpoint: ___
□ History endpoint: ___
□ Create batch endpoint: ___
□ Status classification: ___

Frontend Tests:
□ Dashboard loads: ___
□ Auto-refresh works: ___
□ All components visible: ___
□ Responsive design: ___

Integration Tests:
□ ESP32 connection: ___
□ Data flow: ___
□ Real-time updates: ___

Performance:
□ Response time: ___ ms
□ Handles 100+ batches: ___

Overall Status: PASS / FAIL
Notes: _____________
```

---

**Good luck with your testing! 🚀**
