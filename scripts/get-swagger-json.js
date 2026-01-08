#!/usr/bin/env node

/**
 * Script to fetch Swagger JSON schema from the API
 * Usage: node scripts/get-swagger-json.js [output-file]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3002';
const OUTPUT_FILE = process.argv[2] || 'swagger.json';
const SWAGGER_JSON_PATH = '/api-json';

// Colors for console output
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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
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

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function fetchSwaggerJson() {
  const url = `${BASE_URL}${SWAGGER_JSON_PATH}`;
  
  log(`\n📥 Fetching Swagger JSON from: ${url}`, 'cyan');
  
  try {
    const response = await makeRequest(url);
    
    if (response.statusCode !== 200) {
      log(`✗ Failed to fetch Swagger JSON. Status: ${response.statusCode}`, 'red');
      log(`Response: ${response.data}`, 'yellow');
      process.exit(1);
    }

    // Parse JSON to validate it
    let swaggerJson;
    try {
      swaggerJson = JSON.parse(response.data);
    } catch (parseError) {
      log(`✗ Invalid JSON response`, 'red');
      log(`Error: ${parseError.message}`, 'yellow');
      process.exit(1);
    }

    // Save to file
    const outputPath = path.resolve(OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(swaggerJson, null, 2), 'utf8');

    log(`✓ Swagger JSON saved successfully!`, 'green');
    log(`  File: ${outputPath}`, 'cyan');
    log(`  Size: ${(response.data.length / 1024).toFixed(2)} KB`, 'cyan');
    log(`  Endpoints: ${Object.keys(swaggerJson.paths || {}).length}`, 'cyan');
    log(`  Schemas: ${Object.keys(swaggerJson.components?.schemas || {}).length}`, 'cyan');
    
    return swaggerJson;
  } catch (error) {
    log(`✗ Error fetching Swagger JSON: ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log(`\n💡 Make sure the API server is running at ${BASE_URL}`, 'yellow');
      log(`   You can start it with: docker-compose up -d`, 'yellow');
    }
    
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await fetchSwaggerJson();
  } catch (error) {
    log(`\n✗ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }
})();

