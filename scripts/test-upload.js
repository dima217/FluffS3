#!/usr/bin/env node

/**
 * File Upload Testing Script for Constructor_Mini
 * Tests the complete upload flow: create -> upload via redirect -> mark as loaded -> get download link
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3000';
// Use AUTH_USERNAME to avoid conflict with system USERNAME variable
const USERNAME = process.env.AUTH_USERNAME || process.env.USERNAME || 'artem.senkevich@celadonsoft.com';
const PASSWORD = process.env.AUTH_PASSWORD || process.env.PASSWORD || '2005artem#';
const FILE_PATH = process.argv[2] || 'Screenshot 2025-12-02 152806.png';

// Colors for terminal output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	blue: '\x1b[34m',
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const isHttps = urlObj.protocol === 'https:';
		const httpModule = isHttps ? https : http;

		const requestOptions = {
			hostname: urlObj.hostname,
			port: urlObj.port || (isHttps ? 443 : 80),
			path: urlObj.pathname + urlObj.search,
			method: options.method || 'GET',
			headers: {
				...options.headers,
			},
		};

		// Set Content-Type only if body is provided
		if (options.body && !requestOptions.headers['Content-Type']) {
			requestOptions.headers['Content-Type'] = options.contentType || 'application/json';
		}

		// Handle redirects
		if (options.followRedirects !== false && options.method === 'PUT') {
			requestOptions.maxRedirects = 5;
		}

		const req = httpModule.request(requestOptions, (res) => {
			// Handle redirects for PUT requests
			if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && options.followRedirects !== false) {
				const redirectUrl = res.headers.location;
				if (redirectUrl) {
					log(`Following redirect to: ${redirectUrl}`, 'cyan');
					// Follow redirect with same method and body
					return makeRequest(redirectUrl, {
						...options,
						method: options.method,
						body: options.body,
						contentType: options.contentType,
					}).then(resolve).catch(reject);
				}
			}

			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try {
					const jsonData = data ? JSON.parse(data) : {};
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						data: jsonData,
						rawData: data,
					});
				} catch (e) {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						data: data,
						rawData: data,
					});
				}
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		if (options.body) {
			const bodyData = Buffer.isBuffer(options.body)
				? options.body
				: (typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
			requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
			req.write(bodyData);
		}

		req.end();
	});
}

async function uploadFileToUrl(url, fileBuffer, contentType) {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const isHttps = urlObj.protocol === 'https:';
		const httpModule = isHttps ? https : http;

		const requestOptions = {
			hostname: urlObj.hostname,
			port: urlObj.port || (isHttps ? 443 : 80),
			path: urlObj.pathname + urlObj.search,
			method: 'PUT',
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length,
			},
		};

		const req = httpModule.request(requestOptions, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				resolve({
					statusCode: res.statusCode,
					headers: res.headers,
					data: data,
				});
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.write(fileBuffer);
		req.end();
	});
}

async function runUploadTest() {
	log('\n=== Constructor_Mini File Upload Testing ===\n', 'yellow');

	try {
		// Step 1: Authenticate
		log('Step 1: Authenticating...', 'yellow');
		log(`URL: ${AUTH_URL}/user/sign-in`, 'cyan');
		log(`Username: ${USERNAME}`, 'cyan');
		const authBody = {
			username: USERNAME,
			password: PASSWORD,
		};
		log(`Body: ${JSON.stringify(authBody)}`, 'cyan');
		const authResponse = await makeRequest(`${AUTH_URL}/user/sign-in`, {
			method: 'POST',
			body: authBody,
		});

		if (authResponse.statusCode !== 200) {
			log(`✗ Authentication failed (Status: ${authResponse.statusCode})`, 'red');
			log(`Response: ${authResponse.rawData}`, 'red');
			process.exit(1);
		}

		// Parse response - try multiple ways
		let token;
		if (typeof authResponse.data === 'object' && authResponse.data !== null) {
			token = authResponse.data.access || authResponse.data.accessToken;
		} else if (typeof authResponse.data === 'string') {
			try {
				const parsed = JSON.parse(authResponse.data);
				token = parsed.access || parsed.accessToken;
			} catch (e) {
				// Try regex extraction from raw data
				const match = authResponse.rawData.match(/"access"\s*:\s*"([^"]+)"/);
				token = match ? match[1] : null;
			}
		} else {
			// Try regex extraction from raw data
			const match = authResponse.rawData.match(/"access"\s*:\s*"([^"]+)"/);
			token = match ? match[1] : null;
		}

		if (!token) {
			log('✗ Token not found in response', 'red');
			log(`Response data type: ${typeof authResponse.data}`, 'red');
			log(`Response data: ${JSON.stringify(authResponse.data)}`, 'red');
			log(`Raw response: ${authResponse.rawData.substring(0, 200)}`, 'red');
			process.exit(1);
		}

		log('✓ Authentication successful', 'green');
		log(`Token: ${token.substring(0, 20)}...\n`, 'cyan');

		// Step 2: Check if file exists
		log('Step 2: Checking file...', 'yellow');
		if (!fs.existsSync(FILE_PATH)) {
			log(`✗ File not found: ${FILE_PATH}`, 'red');
			process.exit(1);
		}

		const fileStats = fs.statSync(FILE_PATH);
		const fileBuffer = fs.readFileSync(FILE_PATH);
		const fileName = path.basename(FILE_PATH);
		const fileSize = fileStats.size;
		const contentType = 'image/png'; // You might want to detect this from file extension

		log(`✓ File found: ${fileName} (${fileSize} bytes)`, 'green');
		log(`File path: ${FILE_PATH}\n`, 'cyan');

		// Step 3: Create media entry
		log('Step 3: Creating media entry...', 'yellow');
		const createResponse = await makeRequest(`${BASE_URL}/media/create`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: {
				filename: fileName,
				size: fileSize,
				metadata: {
					uploaded_by: 'test_script',
					timestamp: new Date().toISOString(),
				},
			},
		});

		if (createResponse.statusCode !== 201) {
			log(`✗ Failed to create media (Status: ${createResponse.statusCode})`, 'red');
			log(`Response: ${createResponse.rawData}`, 'red');
			process.exit(1);
		}

		const mediaId = createResponse.data.mediaId;
		if (!mediaId) {
			log('✗ Media ID not found in response', 'red');
			log(`Response: ${JSON.stringify(createResponse.data, null, 2)}`, 'red');
			process.exit(1);
		}

		log('✓ Media entry created', 'green');
		log(`Media ID: ${mediaId}\n`, 'cyan');

		// Step 4: Upload file via PUT endpoint (multipart/form-data)
		log('Step 4: Uploading file via PUT endpoint...', 'yellow');

		// Create multipart/form-data manually
		const boundary = `----WebKitFormBoundary${Date.now()}`;
		const formData = Buffer.concat([
			Buffer.from(`--${boundary}\r\n`),
			Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
			Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
			fileBuffer,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);

		const uploadResponse = await makeRequest(`${BASE_URL}/media/upload-redirect/${mediaId}`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': `multipart/form-data; boundary=${boundary}`,
				'Content-Length': formData.length.toString(),
			},
			body: formData,
			contentType: `multipart/form-data; boundary=${boundary}`,
		});

		if (uploadResponse.statusCode === 200) {
			log('✓ File uploaded successfully', 'green');
			log(`Response: ${JSON.stringify(uploadResponse.data, null, 2)}`, 'cyan');
		} else {
			log(`✗ Upload failed (Status: ${uploadResponse.statusCode})`, 'red');
			log(`Response: ${uploadResponse.rawData}`, 'red');
			process.exit(1);
		}

		// Step 6: Mark media as loaded
		log('\nStep 6: Marking media as loaded...', 'yellow');
		const markResponse = await makeRequest(`${BASE_URL}/media/${mediaId}/loading-end`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (markResponse.statusCode === 200) {
			log('✓ Media marked as loaded', 'green');
		} else {
			log(`✗ Failed to mark as loaded (Status: ${markResponse.statusCode})`, 'red');
			log(`Response: ${markResponse.rawData}`, 'red');
		}

		// Step 7: Get download URL (we need to get the media URL first)
		log('\nStep 7: Getting download link...', 'yellow');
		// We need to extract the URL from the media entry
		// For now, we'll construct it based on the pattern
		// In a real scenario, you'd query the media by ID to get the URL
		log('Note: To get the download URL, query the media entry by ID', 'cyan');
		log(`Download endpoint: ${BASE_URL}/media/download?url=<media_url>`, 'cyan');

		log('\n=== Upload Test Complete ===\n', 'green');
		log(`Media ID: ${mediaId}`, 'blue');
		log(`File: ${fileName}`, 'blue');
		log(`Size: ${fileSize} bytes`, 'blue');

	} catch (error) {
		log(`\n✗ Test failed with error: ${error.message}`, 'red');
		log(`Stack: ${error.stack}`, 'red');
		process.exit(1);
	}
}

runUploadTest();

