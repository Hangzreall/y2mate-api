/**
 * Y2Mate Auto Request - Vercel Serverless API Handler
 * 
 * Deploy to Vercel:
 * 1. Create vercel.json in project root
 * 2. Set environment variables in Vercel dashboard
 * 3. Deploy with: vercel --prod
 * 
 * Usage:
 *   GET /api/vercel?video_id=fldKt9IIUyU&format=mp3
 *   POST /api/vercel with body: { "video_id": "fldKt9IIUyU", "format": "mp3" }
 */

// Anti-blocking configuration from environment variables
const ANTI_BLOCK_CONFIG = {
    minDelay: parseInt(process.env.DELAY_MIN_MS) || 1000,
    maxDelay: parseInt(process.env.DELAY_MAX_MS) || 5000,
    timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    proxyUrl: process.env.PROXY_URL || null,
    rotateUserAgent: process.env.ROTATE_USER_AGENT !== 'false',
    rotateReferer: process.env.ROTATE_REFERER !== 'false'
};

// Multiple User-Agents for rotation (anti-fingerprinting)
const USER_AGENTS = [
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; LM-Q720) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; V2120) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
];

// Multiple referers for rotation
const REFERERS = [
    'https://v1.y2mate.nu/',
    'https://y2mate.nu/',
    'https://www.y2mate.nu/',
    'https://v1.y2mate.nu/id',
    'https://y2mate.is/'
];

const BASE_URL_CONVERT = 'https://ccccco.etacloud.org';
const BASE_URL_DOWNLOAD = 'https://coccoc.etacloud.org';

/**
 * Generate random headers with rotation
 */
function generateRandomHeaders() {
    const headers = {
        'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'accept': '*/*',
        'origin': 'https://v1.y2mate.nu',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
    };
    
    if (ANTI_BLOCK_CONFIG.rotateUserAgent) {
        headers['user-agent'] = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    } else {
        headers['user-agent'] = USER_AGENTS[0];
    }
    
    if (ANTI_BLOCK_CONFIG.rotateReferer) {
        headers['referer'] = REFERERS[Math.floor(Math.random() * REFERERS.length)];
    } else {
        headers['referer'] = REFERERS[0];
    }
    
    return headers;
}

/**
 * Get random delay
 */
function getRandomDelay() {
    const min = ANTI_BLOCK_CONFIG.minDelay;
    const max = ANTI_BLOCK_CONFIG.maxDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(url, headers, retryCount = 0) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? require('https') : require('http');
        
        const options = {
            method: 'GET',
            headers: headers,
            timeout: ANTI_BLOCK_CONFIG.timeout
        };
        
        const request = client.request(url, options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => { data += chunk; });
            
            response.on('end', async () => {
                if ((response.statusCode === 429 || response.statusCode === 403) && retryCount < ANTI_BLOCK_CONFIG.maxRetries) {
                    const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                    await sleep(backoffDelay);
                    const newHeaders = generateRandomHeaders();
                    const result = await makeRequest(url, newHeaders, retryCount + 1);
                    resolve(result);
                    return;
                }
                
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    data: data
                });
            });
        });
        
        request.on('error', async (error) => {
            if (retryCount < ANTI_BLOCK_CONFIG.maxRetries) {
                const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                await sleep(backoffDelay);
                const newHeaders = generateRandomHeaders();
                const result = await makeRequest(url, newHeaders, retryCount + 1);
                resolve(result);
                return;
            }
            reject(error);
        });
        
        request.on('timeout', async () => {
            if (retryCount < ANTI_BLOCK_CONFIG.maxRetries) {
                request.destroy();
                const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                await sleep(backoffDelay);
                const newHeaders = generateRandomHeaders();
                const result = await makeRequest(url, newHeaders, retryCount + 1);
                resolve(result);
                return;
            }
            request.destroy();
            reject(new Error('Request timeout after max retries'));
        });
        
        request.end();
    });
}

/**
 * Vercel Serverless Handler
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }
    
    try {
        // Get parameters from query or body
        const videoId = req.query.video_id || req.body?.video_id;
        const format = req.query.format || req.body?.format || 'mp3';
        const quality = req.query.quality || req.body?.quality || '3';
        
        if (!videoId) {
            return res.status(400).json({
                error: 'Missing video_id parameter',
                usage: '/api/vercel?video_id=VIDEO_ID&format=mp3'
            });
        }
        
        // Log request info (for debugging)
        console.log(`Processing request for video: ${videoId}, format: ${format}`);
        
        // Add random delay (anti-rate-limiting)
        const delay = getRandomDelay();
        await sleep(delay);
        
        // Generate random headers
        const headers = generateRandomHeaders();
        
        // Build download URL (requires valid signature from y2mate.nu)
        // Note: You need to implement signature scraping from y2mate.nu
        const response = {
            success: true,
            video_id: videoId,
            format: format,
            quality: quality,
            anti_block: {
                user_agent_rotation: ANTI_BLOCK_CONFIG.rotateUserAgent,
                referer_rotation: ANTI_BLOCK_CONFIG.rotateReferer,
                delay_range: `${ANTI_BLOCK_CONFIG.minDelay}-${ANTI_BLOCK_CONFIG.maxDelay}ms`,
                max_retries: ANTI_BLOCK_CONFIG.maxRetries
            },
            headers_used: {
                'user-agent': headers['user-agent'],
                'referer': headers['referer']
            },
            message: 'To download, you need a valid signature from y2mate.nu',
            note: 'The signature (sig) parameter must be obtained from y2mate.nu first'
        };
        
        return res.status(200).json(response);
        
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({
            error: 'Request failed',
            message: error.message,
            retry_after: getRandomDelay()
        });
    }
}
