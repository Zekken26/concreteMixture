# 🚀 Quick Start Guide

## Get Your System Running in 5 Minutes!

### Step 1: Start the Backend (Django) ⚙️

Open a terminal and run:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python create_sample_data.py
python manage.py runserver
```

✅ Backend will be running at: `http://localhost:8000`

### Step 2: Start the Frontend (React) 🎨

Open a **new terminal** and run:

```bash
cd frontend
npm install
npm run dev
```

✅ Dashboard will be running at: `http://localhost:8080`

### Step 3: View Your Dashboard 📊

Open your browser and go to: **http://localhost:8080**

You should see:
- ✅ Current mix status with color-coded indicator
- ✅ Live sensor values (Cement, Water, Sand, Gravel)
- ✅ W/C ratio chart showing trends
- ✅ Historical data table
- ✅ Auto-refresh every 5 seconds

## 🧪 Test the API

### View All Data
```bash
curl http://localhost:8000/api/mix-history/
```

### View Latest Mix
```bash
curl http://localhost:8000/api/latest-mix/
```

### Send New Data (Simulate ESP32)
```bash
curl -X POST http://localhost:8000/api/mix-data/ \
  -H "Content-Type: application/json" \
  -d '{
    "cement_weight": 50.0,
    "water_weight": 22.5,
    "sand_weight": 75.0,
    "gravel_weight": 100.0
  }'
```

## 📱 Access from Your Phone

1. Find your computer's IP address:
   - **Windows**: Run `ipconfig` → look for IPv4 Address
   - **Mac/Linux**: Run `ifconfig` → look for inet address

2. Make sure your phone and computer are on the same WiFi

3. On your phone's browser, go to:
   ```
   http://YOUR_IP_ADDRESS:8080
   ```
   Example: `http://192.168.1.100:8080`

## 🔧 Troubleshooting

### Backend Not Starting?
- Make sure Python 3.11+ is installed: `python --version`
- Install dependencies: `pip install djangorestframework django-cors-headers`

### Frontend Not Starting?
- Make sure Node.js is installed: `node --version`
- Clear cache: `rm -rf node_modules && npm install`

### Can't Connect from Phone?
- Check Windows Firewall settings
- Ensure Django is running on `0.0.0.0:8000`:
  ```bash
  python manage.py runserver 0.0.0.0:8000
  ```

### No Data Showing?
- Run the sample data script: `python create_sample_data.py`
- Check Django terminal for errors
- Check browser console (F12) for errors

## 🎯 Next Steps

1. **Connect ESP32**: See [ESP32_SETUP.md](ESP32_SETUP.md)
2. **Customize Dashboard**: Edit files in `frontend/src/components/dashboard/`
3. **Add More Batches**: Run `python create_sample_data.py` again
4. **Access Admin Panel**: Visit `http://localhost:8000/admin` (create superuser first)

## 📚 Full Documentation

- Complete setup: [README.md](README.md)
- ESP32 integration: [ESP32_SETUP.md](ESP32_SETUP.md)

## 💡 Quick Tips

- **Ctrl+C** to stop servers
- Frontend auto-refreshes every 5 seconds
- Backend automatically calculates W/C ratio and status
- All code is heavily commented for learning
- Sample data is included for testing and demonstration

---

**Enjoy your IoT Concrete Mix Monitoring System! 🏗️**
