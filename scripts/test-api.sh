#!/bin/bash

# API Testing Script for Constructor_Mini
# This script tests the media API endpoints

BASE_URL="${BASE_URL:-http://localhost:3002}"
JWT_TOKEN="${JWT_TOKEN:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Constructor_Mini API Testing ===${NC}\n"

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}Error: JWT_TOKEN environment variable is not set${NC}"
    echo -e "${YELLOW}Usage: JWT_TOKEN=your_token ./scripts/test-api.sh${NC}"
    exit 1
fi

# Test 1: Health check (if available)
echo -e "${YELLOW}Test 1: Checking if service is running...${NC}"
if curl -s -f "${BASE_URL}/api" > /dev/null; then
    echo -e "${GREEN}✓ Service is running${NC}\n"
else
    echo -e "${RED}✗ Service is not accessible at ${BASE_URL}${NC}\n"
    exit 1
fi

# Test 2: Create media
echo -e "${YELLOW}Test 2: Creating media...${NC}"
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/media/create" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "filename": "test-image.jpg",
        "size": 1024,
        "metadata": {
            "test": true
        }
    }')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Media created successfully${NC}"
    echo "Response: $CREATE_RESPONSE"
    
    # Extract mediaId from response
    MEDIA_ID=$(echo $CREATE_RESPONSE | grep -o '"mediaId":"[^"]*' | cut -d'"' -f4)
    PRESIGNED_URL=$(echo $CREATE_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$MEDIA_ID" ]; then
        echo -e "${GREEN}Media ID: ${MEDIA_ID}${NC}\n"
        
        # Test 3: Mark media as loaded
        echo -e "${YELLOW}Test 3: Marking media as loaded...${NC}"
        MARK_RESPONSE=$(curl -s -X POST "${BASE_URL}/media/${MEDIA_ID}/loading-end" \
            -H "Authorization: Bearer ${JWT_TOKEN}")
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Media marked as loaded${NC}"
            echo "Response: $MARK_RESPONSE\n"
        else
            echo -e "${RED}✗ Failed to mark media as loaded${NC}\n"
        fi
        
        # Test 4: Download file (if presigned URL is available)
        if [ -n "$PRESIGNED_URL" ]; then
            echo -e "${YELLOW}Test 4: Testing download endpoint...${NC}"
            # Extract URL path from presigned URL or use a test path
            DOWNLOAD_URL="/test-user/test-file.jpg"
            DOWNLOAD_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/media/download?url=${DOWNLOAD_URL}" \
                -H "Authorization: Bearer ${JWT_TOKEN}")
            
            HTTP_CODE=$(echo "$DOWNLOAD_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
                echo -e "${GREEN}✓ Download endpoint is accessible (HTTP ${HTTP_CODE})${NC}\n"
            else
                echo -e "${RED}✗ Download endpoint failed (HTTP ${HTTP_CODE})${NC}\n"
            fi
        fi
    else
        echo -e "${RED}✗ Failed to extract media ID from response${NC}\n"
    fi
else
    echo -e "${RED}✗ Failed to create media${NC}"
    echo "Response: $CREATE_RESPONSE\n"
fi

echo -e "${YELLOW}=== Testing Complete ===${NC}"

