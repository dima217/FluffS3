#!/usr/bin/env node

/**
 * API Testing Script for Constructor_Mini
 * Node.js version for cross-platform compatibility
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';
const JWT_TOKEN = process.env.JWT_TOKEN;

// Colors for terminal output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
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
				'Content-Type': 'application/json',
				...options.headers,
			},
		};

		const req = httpModule.request(requestOptions, (res) => {
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
			req.write(JSON.stringify(options.body));
		}

		req.end();
	});
}

async function runTests() {
	log('\n=== Constructor_Mini API Testing ===\n', 'yellow');

	if (!JWT_TOKEN) {
		log('Error: JWT_TOKEN environment variable is not set', 'red');
		log('Usage: JWT_TOKEN=your_token node scripts/test-api.js', 'yellow');
		process.exit(1);
	}

	const headers = {
		Authorization: `Bearer ${JWT_TOKEN}`,
	};

	try {
		// Test 1: Check if service is running (Swagger endpoint)
		log('Test 1: Checking if service is running...', 'yellow');
		try {
			const swaggerCheck = await makeRequest(`${BASE_URL}/api`);
			if (swaggerCheck.statusCode === 200 || swaggerCheck.statusCode === 301) {
				log('✓ Service is running\n', 'green');
			} else {
				log(`✗ Service returned status ${swaggerCheck.statusCode}\n`, 'red');
			}
		} catch (error) {
			log(`✗ Service is not accessible: ${error.message}\n`, 'red');
			process.exit(1);
		}

		// Test 2: Create media
		log('Test 2: Creating media...', 'yellow');
		const createResponse = await makeRequest(`${BASE_URL}/media/create`, {
			method: 'POST',
			headers,
			body: {
				filename: 'test-image.jpg',
				size: 1024,
				metadata: {
					test: true,
					timestamp: new Date().toISOString(),
				},
			},
		});

		if (createResponse.statusCode === 201) {
			log('✓ Media created successfully', 'green');
			log(`Response: ${JSON.stringify(createResponse.data, null, 2)}`, 'cyan');

			const mediaId = createResponse.data.mediaId;
			const presignedUrl = createResponse.data.url;

			if (mediaId) {
				log(`Media ID: ${mediaId}\n`, 'green');

				// Test 3: Mark media as loaded
				log('Test 3: Marking media as loaded...', 'yellow');
				const markResponse = await makeRequest(
					`${BASE_URL}/media/${mediaId}/loading-end`,
					{
						method: 'POST',
						headers,
					}
				);

				if (markResponse.statusCode === 200) {
					log('✓ Media marked as loaded', 'green');
					log(`Response: ${JSON.stringify(markResponse.data, null, 2)}\n`, 'cyan');
				} else {
					log(
						`✗ Failed to mark media as loaded (Status: ${markResponse.statusCode})`,
						'red'
					);
					log(`Response: ${markResponse.rawData}\n`, 'red');
				}

				// Test 4: Test download endpoint
				log('Test 4: Testing download endpoint...', 'yellow');
				const testUrl = encodeURIComponent('/test-user/test-file.jpg');
				const downloadResponse = await makeRequest(
					`${BASE_URL}/media/download?url=${testUrl}`,
					{
						method: 'GET',
						headers,
					}
				);

				if (downloadResponse.statusCode === 200) {
					log('✓ Download endpoint is accessible', 'green');
				} else if (downloadResponse.statusCode === 404) {
					log('✓ Download endpoint is accessible (file not found, expected)', 'green');
				} else {
					log(
						`✗ Download endpoint returned status ${downloadResponse.statusCode}`,
						'red'
					);
				}
				log(`Response status: ${downloadResponse.statusCode}\n`, 'cyan');
			} else {
				log('✗ Failed to extract media ID from response\n', 'red');
			}
		} else {
			log(`✗ Failed to create media (Status: ${createResponse.statusCode})`, 'red');
			log(`Response: ${createResponse.rawData}\n`, 'red');
		}

		log('=== Testing Complete ===\n', 'yellow');
	} catch (error) {
		log(`\n✗ Test failed with error: ${error.message}`, 'red');
		process.exit(1);
	}
}

runTests();

