#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Email Automation Platform Launcher ===${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker and Docker Compose.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

# Export OpenAI API key for Docker Compose
if [ -f "./src/conductor-mcp/.env" ]; then
    source <(grep "OPENAI_API_KEY" ./src/conductor-mcp/.env)
    export OPENAI_API_KEY
    echo -e "${GREEN}Found OpenAI API key in environment file.${NC}"
else
    echo -e "${YELLOW}Warning: No .env file found with OPENAI_API_KEY.${NC}"
    echo -e "${YELLOW}Please enter your OpenAI API key:${NC}"
    read -p "> " OPENAI_API_KEY
    export OPENAI_API_KEY
fi

# Start services with Docker Compose
echo -e "${YELLOW}Starting services with Docker Compose...${NC}"
docker-compose up -d mongodb postgres rabbitmq
echo -e "${GREEN}Database services started.${NC}"

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 10

# Start the MCP services
echo -e "${YELLOW}Starting Email MCP and Conductor MCP services...${NC}"
docker-compose up -d email-mcp conductor-mcp
echo -e "${GREEN}MCP services started.${NC}"

# Build the dashboard for production
echo -e "${YELLOW}Building the dashboard for production...${NC}"
cd src/dashboard && npm run build:prod

# Start the dashboard server
echo -e "${YELLOW}Starting the dashboard server...${NC}"
cd src/dashboard && node simple-server.js

echo -e "${GREEN}All services started successfully!${NC}"
echo -e "${BLUE}Dashboard: http://localhost:5000${NC}"
echo -e "${BLUE}Conductor MCP API: http://localhost:3001${NC}"
echo -e "${BLUE}Email MCP API: http://localhost:3002${NC}"
echo -e "${BLUE}MongoDB: localhost:27017${NC}"
echo -e "${BLUE}PostgreSQL: localhost:5432${NC}"
echo -e "${BLUE}RabbitMQ Management: http://localhost:15672${NC}" 