#!/bin/bash

# Set OpenAI API key
export OPENAI_API_KEY=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

echo "Checking conductor-mcp API endpoints..."

# First, check if the route files exist and what they export
echo "Checking conductor-mcp API route files:"
docker-compose exec conductor-mcp find /app/src/routes -type f | sort

# Check the index.js file that registers routes
echo -e "\nChecking route registration in index.js:"
docker-compose exec conductor-mcp cat /app/src/index.js | grep -A 20 "app.use"

# Check if the API server is running
echo -e "\nChecking if conductor-mcp API server is running:"
docker-compose ps conductor-mcp

# Get logs to see if there are any startup errors
echo -e "\nChecking conductor-mcp logs for errors:"
docker-compose logs --tail=50 conductor-mcp | grep -E "error|Error|API|app.use|route"

# Try to restart the conductor-mcp service
echo -e "\nRestarting conductor-mcp service..."
docker-compose restart conductor-mcp

echo -e "\nWaiting for conductor-mcp to restart (15 seconds)..."
sleep 15

# Check if API is running after restart
echo -e "\nChecking conductor-mcp API health after restart:"
curl -v http://localhost:3001/api/health

echo -e "\nAttempting to access emails endpoint directly:"
curl -v http://localhost:3001/api/emails?page=1&limit=10

echo -e "\nIf API endpoints are still not accessible, you may need to:"
echo "1. Check the route registration in the conductor-mcp service"
echo "2. Ensure the API server is properly configured to listen on port 3001"
echo "3. Verify the database schemas are properly initialized" 