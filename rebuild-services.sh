#!/bin/bash

# Set OpenAI API key
export OPENAI_API_KEY=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

echo "Completely stopping and removing all containers, volumes, and networks..."
docker-compose down -v

echo "Removing all images related to this project..."
docker-compose rm -f

echo "Removing any orphaned volumes..."
docker volume prune -f

echo "Rebuilding all services from scratch..."
docker-compose build --no-cache

echo "Starting the newly built services..."
docker-compose up -d

echo "Services are being started. Waiting for initialization..."
sleep 20

echo "Current service status:"
docker-compose ps

echo "Checking conductor-mcp logs for errors..."
docker-compose logs --tail=20 conductor-mcp

echo "To check email-mcp logs, run: docker-compose logs email-mcp"
echo "To check if the API is accessible, run: ./check-api.sh"
echo "To start the dashboard, run: cd src/dashboard && ./update-api-config.sh 3001" 