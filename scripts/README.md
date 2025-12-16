# Testing Scripts for Constructor_Mini

This directory contains scripts for testing the Constructor_Mini API and checking service health.

## Available Scripts

### 1. `test-api.sh` / `test-api.js`
Tests the media API endpoints.

**Bash version:**
```bash
JWT_TOKEN=your_jwt_token ./scripts/test-api.sh
```

**Node.js version (cross-platform):**
```bash
JWT_TOKEN=your_jwt_token node scripts/test-api.js
```

**Environment variables:**
- `JWT_TOKEN` (required): JWT authentication token
- `BASE_URL` (optional): Base URL of the API (default: http://localhost:3002)

**Tests performed:**
1. Service availability check
2. Create media endpoint
3. Mark media as loaded endpoint
4. Download file endpoint

### 2. `test-health.sh`
Checks if all required services (MongoDB, MinIO, Application) are running.

```bash
./scripts/test-health.sh
```

**Checks:**
- MongoDB on port 27017
- MinIO on port 9000
- MinIO Console on port 9001
- Application on http://localhost:3002

## Getting a JWT Token

To get a JWT token for testing, you need to authenticate through the Constructor_Auth service first.

Example:
```bash
# Authenticate and get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Extract token from response and use it
export JWT_TOKEN="your_token_here"
```

## Running Tests

1. Make sure all services are running:
   ```bash
   docker-compose up -d
   ```

2. Wait for services to be ready (about 10-20 seconds)

3. Run health check:
   ```bash
   ./scripts/test-health.sh
   ```

4. Get a JWT token and run API tests:
   ```bash
   export JWT_TOKEN="your_token"
   ./scripts/test-api.sh
   # or
   node scripts/test-api.js
   ```

## Troubleshooting

- If services are not accessible, check docker-compose logs:
  ```bash
  docker-compose logs
  ```

- If MongoDB connection fails, verify credentials in `.env` file match docker-compose.yml

- If MinIO connection fails, check that MinIO is healthy:
  ```bash
  docker-compose ps
  ```

- If JWT token is invalid, make sure you're using a valid token from Constructor_Auth service

