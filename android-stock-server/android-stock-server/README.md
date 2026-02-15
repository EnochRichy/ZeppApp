# Android Stock Server for Zepp OS

A Kotlin-based Android app that fetches live NSE stock prices and serves them to your Zepp OS watch via HTTP.

## Features

✅ Fetches real-time NSE stock data from Yahoo Finance
✅ Runs HTTP server on port 8080
✅ Serves data to Zepp OS watch app
✅ Auto-updates every 2 minutes
✅ Simple UI showing live stock prices
✅ No external server needed - runs on your phone!

## What's Included

```
android-stock-server/
├── app/
│   ├── build.gradle                    # App dependencies
│   ├── proguard-rules.pro             # ProGuard config
│   └── src/main/
│       ├── AndroidManifest.xml        # Permissions & config
│       ├── java/com/example/stockserver/
│       │   └── MainActivity.kt        # Main app logic + HTTP server
│       └── res/
│           ├── layout/
│           │   └── activity_main.xml  # UI layout
│           └── xml/
│               ├── backup_rules.xml
│               └── data_extraction_rules.xml
├── build.gradle                        # Project-level config
├── settings.gradle                     # Project settings
└── gradle.properties                   # Gradle properties
```

## Setup Instructions

### 1. Import into Android Studio

1. Open Android Studio
2. Click **File → Open**
3. Navigate to the `android-stock-server` folder
4. Click **OK**
5. Wait for Gradle sync to complete

### 2. Customize Stocks (Optional)

In `MainActivity.kt`, line 22, change the stocks you want to track:

```kotlin
private val stocks = listOf("RELIANCE.NS", "TCS.NS", "INFY.NS")
```

Change to any NSE stocks:
```kotlin
private val stocks = listOf("HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS")
```

### 3. Build and Install

1. Connect your Android phone via USB
2. Enable **USB Debugging** on your phone
3. Click **Run** (▶️) button in Android Studio
4. App will install on your phone

## How to Use

### On Your Phone:

1. **Open the Stock Server app**
2. Click **START SERVER**
3. You'll see:
   ```
   ✓ Server running on port 8080
   
   Fetching stock data...
   ```
4. After ~20 seconds, stock data appears:
   ```
   📊 Live Stock Data
   ══════════════════════════════
   
   RELIANCE
   ₹2850.50  🟢 +35.20 (+1.25%)
   
   TCS
   ₹3645.20  🔴 -16.50 (-0.45%)
   
   INFY
   ₹1520.75  🟢 +31.25 (+2.10%)
   ```

### Find Your Phone's IP Address:

**Method 1: WiFi Settings**
1. Open **Settings → WiFi**
2. Tap on connected network
3. Look for **IP address** (e.g., 192.168.1.105)

**Method 2: Use App (coming soon)**
- Future version will display IP in the app

### On Your Zepp OS Watch:

Update your **app-side/index.js** with your phone's IP:

```javascript
const SERVER_URL = 'http://192.168.1.105:8080' // Your phone's IP
```

Then rebuild and install your Zepp app:
```bash
zeus build
zeus bridge
```

## How It Works

```
Android App (Phone)
    ↓ Fetches every 2 minutes
Yahoo Finance API (NSE stocks)
    ↓ Serves via HTTP
HTTP Server (port 8080)
    ↓ Fetches every 10 seconds
Zepp App-side (in Zepp app)
    ↓ Pushes via MessageBuilder
Zepp Watch App
    ↓ Displays
Your Watch Screen! 📊
```

## API Endpoints

**GET /data**
Returns stock data in format expected by Zepp app:
```json
{
  "todoList": [
    "RELIANCE: ₹2850.50 (+1.25%)",
    "TCS: ₹3645.20 (-0.45%)",
    "INFY: ₹1520.75 (+2.10%)"
  ],
  "timestamp": 1708001234567,
  "lastUpdate": "16:30:15"
}
```

**GET /status**
Returns server status:
```json
{
  "status": "running",
  "stockCount": 3,
  "stocks": ["RELIANCE", "TCS", "INFY"]
}
```

## Troubleshooting

### Server won't start
- Check if port 8080 is already in use
- Make sure INTERNET permission is granted
- Try restarting the app

### No stock data appears
- Make sure phone has internet connection
- Check if you're connected to WiFi (not just mobile data)
- Yahoo Finance might be rate-limiting - wait a few minutes

### Watch not receiving data
- Make sure phone and watch are on **same WiFi network**
- Verify phone's IP address is correct in app-side code
- Check if server is still running (don't close the app)
- Open Zepp app → Mini Programs → Your app (to start app-side)

### "Too Many Requests" error
- Yahoo Finance has rate limits
- App waits 5 seconds between stocks to avoid this
- If error persists, increase delay in code (line 75):
  ```kotlin
  delay(5000) // Change to 10000 (10 seconds)
  ```

## Customization

### Change Update Frequency

In `MainActivity.kt`, line 52:
```kotlin
delay(120000) // Change from 2 minutes (120000ms)
```

To 1 minute:
```kotlin
delay(60000)
```

### Add More Stocks

In `MainActivity.kt`, line 22:
```kotlin
private val stocks = listOf(
    "RELIANCE.NS", 
    "TCS.NS", 
    "INFY.NS",
    "HDFCBANK.NS",  // Add more
    "ITC.NS"
)
```

### Change Port

In `MainActivity.kt`, line 168:
```kotlin
class StockServer(private val activity: MainActivity) : NanoHTTPD(8080) {
```

Change `8080` to any port you want.

## Dependencies

- **NanoHTTPD** (2.3.1) - Lightweight HTTP server
- **Kotlin Coroutines** (1.7.3) - For async operations
- **AndroidX** - Android support libraries

## Permissions Required

- `INTERNET` - To fetch stock data from Yahoo Finance
- `ACCESS_NETWORK_STATE` - To check network connectivity
- `ACCESS_WIFI_STATE` - To get WiFi information

## Important Notes

⚠️ **Keep app running**: Don't close the app or server will stop
⚠️ **WiFi required**: Phone and watch must be on same WiFi
⚠️ **Battery usage**: Server running continuously will use battery
⚠️ **Rate limits**: Yahoo Finance may block if too many requests

## Future Enhancements

Ideas for improvement:
- [ ] Display phone's IP address in app
- [ ] Background service to keep server running
- [ ] Add more stock exchanges (BSE, etc.)
- [ ] Historical price charts
- [ ] Stock watchlist management in UI
- [ ] Notification when stocks hit target price

## License

Free to use and modify for personal projects!

## Support

If you run into issues:
1. Check Logcat in Android Studio for errors
2. Verify all files are properly imported
3. Make sure Gradle sync completed successfully
4. Try cleaning and rebuilding: **Build → Clean Project** then **Build → Rebuild Project**

---

**Congratulations!** 🎉 You now have a personal stock server running on your phone, feeding live data to your smartwatch!
