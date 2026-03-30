# Y2Mate Auto Request Script (Anti-Block / Vercel Ready)

Automated request script for Y2Mate API with advanced anti-blocking features, designed to work on Vercel serverless platform and local environments.

## 🚀 Features

### Anti-Blocking Features
- **🔄 User-Agent Rotation** - 8 different mobile user agents rotated randomly
- **🔗 Referer Rotation** - 5 different referer URLs rotated randomly
- **⏱️ Random Delays** - Configurable delay between requests (prevents rate limiting)
- **🔁 Automatic Retry** - Exponential backoff on 429/403 errors
- **🔒 Proxy Support** - IP rotation via proxy servers
- **⚡ Request Timeout** - Configurable timeout with auto-retry

## 📁 Files

| File | Description |
|------|-------------|
| `auto-request.js` | Main script for local execution |
| `api/vercel.js` | Vercel serverless API handler |
| `vercel.json` | Vercel configuration |
| `package.json` | Node.js dependencies |

## 🛠️ Installation

### Local Usage

```bash
# Navigate to the folder
cd /storage/emulated/0/Download/Reqable/y2mate/

# Install dependencies (optional, for proxy support)
npm install

# Run the script
node auto-request.js
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

## 📖 Usage

### Local Command Line

```bash
# Parse and display request files
node auto-request.js

# Make request for specific video
node auto-request.js <video_id> [format]

# Examples
node auto-request.js fldKt9IIUyU mp3
node auto-request.js fldKt9IIUyU mp4 3
```

### Vercel API

```bash
# GET request
GET https://your-project.vercel.app/api/vercel?video_id=fldKt9IIUyU&format=mp3

# POST request
POST https://your-project.vercel.app/api/vercel
Content-Type: application/json

{
  "video_id": "fldKt9IIUyU",
  "format": "mp3",
  "quality": "3"
}
```

## 🔧 Environment Variables

### For Vercel Dashboard

| Variable | Default | Description |
|----------|---------|-------------|
| `DELAY_MIN_MS` | `1000` | Minimum delay between requests (ms) |
| `DELAY_MAX_MS` | `5000` | Maximum delay between requests (ms) |
| `MAX_RETRIES` | `3` | Maximum retry attempts |
| `REQUEST_TIMEOUT_MS` | `30000` | Request timeout (ms) |
| `PROXY_URL` | `null` | Proxy URL for IP rotation |
| `ROTATE_USER_AGENT` | `true` | Enable user-agent rotation |
| `ROTATE_REFERER` | `true` | Enable referer rotation |
| `ENABLE_JITTER` | `true` | Enable random jitter |

### Setting Environment Variables

**Vercel Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the variables above

**Command Line:**
```bash
DELAY_MIN_MS=2000 DELAY_MAX_MS=6000 PROXY_URL=http://proxy:port node auto-request.js fldKt9IIUyU mp3
```

## 🔄 Anti-Block Strategy

### 1. User-Agent Rotation
```javascript
// 8 different mobile user agents
- Android 10 (Generic)
- Android 11 (Samsung SM-G991B)
- Android 12 (Samsung SM-A536B)
- Android 13 (Pixel 7)
- Android 10 (LG LM-Q720)
- Android 11 (Moto G Power)
- Android 12 (Redmi Note 11)
- Android 13 (Vivo V2120)
```

### 2. Referer Rotation
```javascript
// 5 different referer URLs
- https://v1.y2mate.nu/
- https://y2mate.nu/
- https://www.y2mate.nu/
- https://v1.y2mate.nu/id
- https://y2mate.is/
```

### 3. Exponential Backoff
```
Retry 1: 1-2 seconds
Retry 2: 2-4 seconds
Retry 3: 4-8 seconds
```

### 4. Rate Limit Handling
- Detects 429 (Too Many Requests) responses
- Detects 403 (Forbidden) responses
- Automatically retries with new headers

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "video_id": "fldKt9IIUyU",
  "format": "mp3",
  "quality": "3",
  "anti_block": {
    "user_agent_rotation": true,
    "referer_rotation": true,
    "delay_range": "1000-5000ms",
    "max_retries": 3
  },
  "headers_used": {
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K)...",
    "referer": "https://v1.y2mate.nu/"
  }
}
```

### Error Response
```json
{
  "error": "Request failed",
  "message": "Error details here",
  "retry_after": 2500
}
```

## ⚠️ Important Notes

1. **Signature Required**: The `sig` parameter must be obtained from y2mate.nu first. It's time-based and expires.

2. **Fresh Captures**: Capture new requests regularly to get valid signatures.

3. **Rate Limiting**: Even with anti-blocking, respect the API's rate limits.

4. **Proxy Support**: For production use, configure a rotating proxy service:
   ```bash
   PROXY_URL=http://username:password@proxy-server:port
   ```

## 🐛 Troubleshooting

### "Rate limited" errors
- Increase `DELAY_MIN_MS` and `DELAY_MAX_MS`
- Configure a proxy for IP rotation
- Reduce request frequency

### "Timeout" errors
- Increase `REQUEST_TIMEOUT_MS`
- Check network connectivity
- Configure a faster proxy

### "Invalid signature" errors
- Capture a fresh request from y2mate.nu
- Signatures expire quickly (minutes)

## 📝 License

MIT License - Use at your own risk

## ⚠️ Disclaimer

This script is for educational purposes only. Please respect y2mate's terms of service and rate limits.
