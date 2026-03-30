/**
 * Y2Mate Auto Request Script (Anti-Block / Vercel Ready)
 * Automatically parses request files and makes API requests
 * With IP rotation, user-agent rotation, and anti-blocking features
 * 
 * Usage: node auto-request.js [video_id] [format]
 * Example: node auto-request.js fldKt9IIUyU mp3
 * 
 * Vercel Deployment: 
 *   - Set environment variables for PROXY_URL, DELAY_MS
 *   - Enable rotating user agents and request delays
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Try to load https-proxy-agent for proxy support
let HttpsProxyAgent = null;
try {
    HttpsProxyAgent = require('https-proxy-agent');
} catch (e) {
    console.log('⚠️  https-proxy-agent not installed. Proxy support disabled.');
    console.log('   Run: npm install https-proxy-agent\n');
}

// Configuration
const REQUEST_FOLDER = '/storage/emulated/0/Download/Reqable/y2mate';
const BASE_URL_CONVERT = 'https://ccccco.etacloud.org';
const BASE_URL_DOWNLOAD = 'https://coccoc.etacloud.org';

// Anti-blocking configuration
const ANTI_BLOCK_CONFIG = {
    // Random delay between requests (ms) - prevents rate limiting
    minDelay: parseInt(process.env.DELAY_MIN_MS) || 1000,
    maxDelay: parseInt(process.env.DELAY_MAX_MS) || 5000,
    
    // Request timeout
    timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
    
    // Max retries with exponential backoff
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    
    // Proxy support (for IP rotation)
    proxyUrl: process.env.PROXY_URL || null,
    
    // Enable random user-agent rotation
    rotateUserAgent: process.env.ROTATE_USER_AGENT !== 'false',
    
    // Enable random referer rotation
    rotateReferer: process.env.ROTATE_REFERER !== 'false',
    
    // Add random jitter to requests
    enableJitter: process.env.ENABLE_JITTER !== 'false'
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

// Base headers template (user-agent and referer will be rotated)
const BASE_HEADERS_TEMPLATE = {
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

/**
 * Generate random headers with rotation (anti-fingerprinting)
 */
function generateRandomHeaders() {
    const headers = { ...BASE_HEADERS_TEMPLATE };
    
    // Rotate user-agent
    if (ANTI_BLOCK_CONFIG.rotateUserAgent) {
        headers['user-agent'] = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    } else {
        headers['user-agent'] = USER_AGENTS[0];
    }
    
    // Rotate referer
    if (ANTI_BLOCK_CONFIG.rotateReferer) {
        headers['referer'] = REFERERS[Math.floor(Math.random() * REFERERS.length)];
    } else {
        headers['referer'] = REFERERS[0];
    }
    
    return headers;
}

/**
 * Get random delay between min and max (anti-rate-limiting)
 */
function getRandomDelay() {
    const min = ANTI_BLOCK_CONFIG.minDelay;
    const max = ANTI_BLOCK_CONFIG.maxDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse request file and extract URL and headers
 */
function parseRequestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // First line contains the HTTP method, URL, and protocol
    const firstLine = lines[0].trim();
    const parts = firstLine.split(' ');
    
    const method = parts[0]; // GET or POST
    const rawUrl = parts[1];
    
    // Parse headers
    const headers = { ...BASE_HEADERS_TEMPLATE };
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line.includes(':')) {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            
            // Skip pseudo-headers and protocol lines
            if (!key.startsWith('sec-') && key !== 'host' && key !== 'upgrade-insecure-requests') {
                headers[key.toLowerCase()] = value;
            } else if (key === 'host') {
                headers['host'] = value;
            }
        }
    }
    
    return { method, rawUrl, headers };
}

/**
 * Make HTTP/HTTPS request with retry logic and anti-blocking
 */
async function makeRequest(url, headers, retryCount = 0) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        const options = {
            method: 'GET',
            headers: headers,
            timeout: ANTI_BLOCK_CONFIG.timeout
        };
        
        // Proxy support (for IP rotation)
        let agent = null;
        if (ANTI_BLOCK_CONFIG.proxyUrl && HttpsProxyAgent) {
            try {
                agent = new HttpsProxyAgent(ANTI_BLOCK_CONFIG.proxyUrl);
                options.agent = agent;
                console.log(`🔒 Using proxy: ${ANTI_BLOCK_CONFIG.proxyUrl}`);
            } catch (e) {
                console.log(`⚠️  Failed to configure proxy: ${e.message}`);
            }
        }
        
        const request = client.request(url, options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', async () => {
                // Handle rate limiting (429) with exponential backoff
                if (response.statusCode === 429 || response.statusCode === 403) {
                    if (retryCount < ANTI_BLOCK_CONFIG.maxRetries) {
                        const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                        console.log(`⚠️  Rate limited (${response.statusCode}). Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retryCount + 1}/${ANTI_BLOCK_CONFIG.maxRetries})`);
                        await sleep(backoffDelay);
                        
                        // Rotate headers on retry
                        const newHeaders = generateRandomHeaders();
                        const result = await makeRequest(url, newHeaders, retryCount + 1);
                        resolve(result);
                        return;
                    }
                }
                
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    data: data
                });
            });
        });
        
        request.on('error', async (error) => {
            // Retry on network errors
            if (retryCount < ANTI_BLOCK_CONFIG.maxRetries) {
                const backoffDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                console.log(`⚠️  Request error: ${error.message}. Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retryCount + 1}/${ANTI_BLOCK_CONFIG.maxRetries})`);
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
                console.log(`⚠️  Request timeout. Retrying in ${Math.round(backoffDelay)}ms... (Attempt ${retryCount + 1}/${ANTI_BLOCK_CONFIG.maxRetries})`);
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
 * Convert video - Step 1: Get signature
 */
async function convertVideo(videoId, format = 'mp3') {
    console.log(`\n🔄 Step 1: Converting video ${videoId} to ${format}...`);
    
    // Add random delay before request (anti-rate-limiting)
    const delay = getRandomDelay();
    console.log(`⏱️  Waiting ${delay}ms before request...`);
    await sleep(delay);
    
    // Generate random headers for this request
    const headers = generateRandomHeaders();
    console.log(`🎭 Using User-Agent: ${headers['user-agent'].substring(0, 50)}...`);
    
    // Read the request file to get the signature pattern
    const requestFiles = fs.readdirSync(REQUEST_FOLDER).filter(f => f.includes('request'));
    
    if (requestFiles.length > 0) {
        const requestFile = requestFiles.find(f => f.includes('convert')) || requestFiles[0];
        const { rawUrl } = parseRequestFile(path.join(REQUEST_FOLDER, requestFile));
        
        console.log(`\n📋 Example convert URL from captured request:`);
        console.log(`${BASE_URL_CONVERT}${rawUrl}`);
        
        // Extract video ID and format from the captured request if available
        const urlParams = new URLSearchParams(rawUrl.split('?')[1]);
        const capturedVid = urlParams.get('v');
        const capturedF = urlParams.get('f');
        
        if (capturedVid) {
            console.log(`\n💡 Captured video ID: ${capturedVid}`);
            console.log(`💡 Captured format: ${capturedF || 'mp3'}`);
        }
    }
    
    return null;
}

/**
 * Download video - Step 2: Download with signature
 */
async function downloadVideo(sig, videoId, format = 'mp3', quality = '3') {
    console.log(`\n📥 Step 2: Downloading video ${videoId}...`);
    
    // Add random delay before request (anti-rate-limiting)
    const delay = getRandomDelay();
    console.log(`⏱️  Waiting ${delay}ms before request...`);
    await sleep(delay);
    
    const downloadUrl = `${BASE_URL_DOWNLOAD}/api/v1/download?sig=${sig}&s=${quality}&v=${videoId}&f=${format}`;
    
    // Generate random headers for this request
    const headers = generateRandomHeaders();
    headers['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
    headers['upgrade-insecure-requests'] = '1';
    headers['sec-fetch-dest'] = 'document';
    
    console.log(`🎭 Using User-Agent: ${headers['user-agent'].substring(0, 50)}...`);
    console.log(`🔗 Download URL: ${downloadUrl.substring(0, 80)}...`);
    
    try {
        const response = await makeRequest(downloadUrl, headers);
        console.log(`✅ Response Status: ${response.statusCode}`);
        
        if (response.statusCode === 302 || response.statusCode === 200) {
            console.log('✅ Download initiated!');
            console.log('📄 Response headers:', JSON.stringify(response.headers, null, 2));
        }
        
        return response;
    } catch (error) {
        console.error('❌ Download failed:', error.message);
        throw error;
    }
}

/**
 * Auto request from all files in folder
 */
async function autoRequestFromFiles() {
    console.log('🚀 Y2Mate Auto Request Script (Anti-Block / Vercel Ready)');
    console.log('========================================================\n');
    
    // Display anti-blocking configuration
    console.log('🛡️  Anti-Block Configuration:');
    console.log(`   - User-Agent Rotation: ${ANTI_BLOCK_CONFIG.rotateUserAgent ? '✅' : '❌'}`);
    console.log(`   - Referer Rotation: ${ANTI_BLOCK_CONFIG.rotateReferer ? '✅' : '❌'}`);
    console.log(`   - Random Delay: ${ANTI_BLOCK_CONFIG.minDelay}-${ANTI_BLOCK_CONFIG.maxDelay}ms`);
    console.log(`   - Max Retries: ${ANTI_BLOCK_CONFIG.maxRetries}`);
    console.log(`   - Request Timeout: ${ANTI_BLOCK_CONFIG.timeout}ms`);
    console.log(`   - Proxy: ${ANTI_BLOCK_CONFIG.proxyUrl || '❌ Not configured'}`);
    console.log('');
    
    try {
        const files = fs.readdirSync(REQUEST_FOLDER);
        console.log(`📁 Found ${files.length} files in ${REQUEST_FOLDER}\n`);
        
        // Find request files
        const requestFiles = files.filter(f => f.includes('request'));
        const responseFiles = files.filter(f => f.includes('response'));
        
        console.log(`📄 Request files: ${requestFiles.length}`);
        console.log(`📄 Response files: ${responseFiles.length}\n`);
        
        // Parse and display request information
        for (const file of requestFiles) {
            console.log(`\n📋 Parsing: ${file}`);
            console.log('-'.repeat(50));
            
            try {
                const { method, rawUrl, headers } = parseRequestFile(path.join(REQUEST_FOLDER, file));
                
                console.log(`Method: ${method}`);
                console.log(`URL: ${rawUrl}`);
                console.log(`Host: ${headers.host || 'N/A'}`);
                
                // Extract parameters from URL
                if (rawUrl.includes('?')) {
                    const params = new URLSearchParams(rawUrl.split('?')[1]);
                    console.log('Parameters:');
                    for (const [key, value] of params.entries()) {
                        const truncatedValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
                        console.log(`  - ${key}: ${truncatedValue}`);
                    }
                }
            } catch (error) {
                console.error(`Error parsing ${file}: ${error.message}`);
            }
        }
        
        console.log('\n✅ Parsing complete!');
        console.log('\n💡 To make actual requests, you need to:');
        console.log('   1. Get a valid signature from y2mate.nu');
        console.log('   2. Run: node auto-request.js <video_id> <format>');
        console.log('   Example: node auto-request.js fldKt9IIUyU mp3');
        console.log('\n🔧 Environment Variables (for Vercel):');
        console.log('   - DELAY_MIN_MS: Minimum delay between requests (default: 1000)');
        console.log('   - DELAY_MAX_MS: Maximum delay between requests (default: 5000)');
        console.log('   - MAX_RETRIES: Max retry attempts (default: 3)');
        console.log('   - REQUEST_TIMEOUT_MS: Request timeout (default: 30000)');
        console.log('   - PROXY_URL: Proxy URL for IP rotation (optional)');
        console.log('   - ROTATE_USER_AGENT: Enable UA rotation (default: true)');
        console.log('   - ROTATE_REFERER: Enable referer rotation (default: true)');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // No arguments - parse and display file information
        await autoRequestFromFiles();
    } else if (args.length >= 1) {
        // With video ID argument
        const videoId = args[0];
        const format = args[1] || 'mp3';
        const quality = args[2] || '3';
        
        console.log('🚀 Y2Mate Auto Request Script (Anti-Block / Vercel Ready)');
        console.log('========================================================\n');
        
        // Display anti-blocking configuration
        console.log('🛡️  Anti-Block Configuration:');
        console.log(`   - User-Agent Rotation: ${ANTI_BLOCK_CONFIG.rotateUserAgent ? '✅' : '❌'}`);
        console.log(`   - Referer Rotation: ${ANTI_BLOCK_CONFIG.rotateReferer ? '✅' : '❌'}`);
        console.log(`   - Random Delay: ${ANTI_BLOCK_CONFIG.minDelay}-${ANTI_BLOCK_CONFIG.maxDelay}ms`);
        console.log(`   - Max Retries: ${ANTI_BLOCK_CONFIG.maxRetries}`);
        console.log(`   - Request Timeout: ${ANTI_BLOCK_CONFIG.timeout}ms`);
        console.log(`   - Proxy: ${ANTI_BLOCK_CONFIG.proxyUrl || '❌ Not configured'}`);
        console.log('');
        
        console.log(`📹 Video ID: ${videoId}`);
        console.log(`🎵 Format: ${format}`);
        console.log(`📊 Quality: ${quality}`);
        
        try {
            // Step 1: Convert (get signature)
            await convertVideo(videoId, format);
            
            // Step 2: Download (requires valid signature)
            // Note: You need to provide a valid signature
            console.log('\n⚠️  To download, you need a valid signature from y2mate.nu');
            console.log('   Please capture a fresh request or visit y2mate.nu first');
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    } else {
        console.log('Usage:');
        console.log('  node auto-request.js                    - Parse and display request files');
        console.log('  node auto-request.js <video_id> [format] - Make request for video');
        console.log('');
        console.log('Examples:');
        console.log('  node auto-request.js');
        console.log('  node auto-request.js fldKt9IIUyU mp3');
        console.log('  node auto-request.js fldKt9IIUyU mp4 3');
        console.log('');
        console.log('Vercel Environment Variables:');
        console.log('  DELAY_MIN_MS=1000 DELAY_MAX_MS=5000 node auto-request.js fldKt9IIUyU mp3');
        console.log('  PROXY_URL=http://proxy:port node auto-request.js fldKt9IIUyU mp3');
    }
}

// Run the script
main();
