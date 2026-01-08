#!/bin/bash

# Script to fetch Swagger JSON schema from the API
# Usage: ./scripts/get-swagger-json.sh [output-file]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${API_URL:-http://localhost:3002}"
OUTPUT_FILE="${1:-swagger.json}"
SWAGGER_JSON_PATH="/api-json"

echo -e "${CYAN}📥 Fetching Swagger JSON from: ${BASE_URL}${SWAGGER_JSON_PATH}${NC}\n"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}✗ curl is not installed${NC}"
    exit 1
fi

# Fetch Swagger JSON
HTTP_CODE=$(curl -s -o "$OUTPUT_FILE" -w "%{http_code}" \
    -H "Accept: application/json" \
    "${BASE_URL}${SWAGGER_JSON_PATH}")

if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}✗ Failed to fetch Swagger JSON. HTTP Status: ${HTTP_CODE}${NC}"
    if [ -f "$OUTPUT_FILE" ]; then
        echo -e "${YELLOW}Response:${NC}"
        cat "$OUTPUT_FILE"
        rm "$OUTPUT_FILE"
    fi
    exit 1
fi

# Validate JSON
if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
    echo -e "${RED}✗ Invalid JSON response${NC}"
    exit 1
fi

# Get file info
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
ENDPOINTS=$(jq '.paths | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
SCHEMAS=$(jq '.components.schemas | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo -e "${GREEN}✓ Swagger JSON saved successfully!${NC}"
echo -e "${CYAN}  File: $(realpath "$OUTPUT_FILE")${NC}"
echo -e "${CYAN}  Size: ${FILE_SIZE}${NC}"
echo -e "${CYAN}  Endpoints: ${ENDPOINTS}${NC}"
echo -e "${CYAN}  Schemas: ${SCHEMAS}${NC}\n"

