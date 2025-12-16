#!/bin/bash

# Health Check Script for Constructor_Mini Services
# Checks if all required services are running

BASE_URL="${BASE_URL:-http://localhost:3002}"
MONGO_PORT=27017
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Constructor_Mini Health Check ===${NC}\n"

# Check MongoDB
echo -e "${YELLOW}Checking MongoDB...${NC}"
if nc -z localhost $MONGO_PORT 2>/dev/null || timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$MONGO_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ MongoDB is running on port ${MONGO_PORT}${NC}"
else
    echo -e "${RED}✗ MongoDB is not accessible on port ${MONGO_PORT}${NC}"
fi

# Check MinIO
echo -e "${YELLOW}Checking MinIO...${NC}"
if nc -z localhost $MINIO_PORT 2>/dev/null || timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$MINIO_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ MinIO is running on port ${MINIO_PORT}${NC}"
else
    echo -e "${RED}✗ MinIO is not accessible on port ${MINIO_PORT}${NC}"
fi

# Check MinIO Console
echo -e "${YELLOW}Checking MinIO Console...${NC}"
if nc -z localhost $MINIO_CONSOLE_PORT 2>/dev/null || timeout 1 bash -c "cat < /dev/null > /dev/tcp/localhost/$MINIO_CONSOLE_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ MinIO Console is running on port ${MINIO_CONSOLE_PORT}${NC}"
else
    echo -e "${RED}✗ MinIO Console is not accessible on port ${MINIO_CONSOLE_PORT}${NC}"
fi

# Check Application
echo -e "${YELLOW}Checking Application...${NC}"
if curl -s -f "${BASE_URL}/api" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is running on ${BASE_URL}${NC}"
else
    echo -e "${RED}✗ Application is not accessible on ${BASE_URL}${NC}"
fi

echo -e "\n${YELLOW}=== Health Check Complete ===${NC}"

