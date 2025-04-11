#!/bin/bash

# Define the port for both dashboard and API
DASHBOARD_PORT=3000
API_PORT=$1

# If no API port is provided, default to 3001
if [ -z "$API_PORT" ]; then
  API_PORT=3001
  echo "No API port specified, using default: $API_PORT"
else
  echo "Using API port: $API_PORT"
fi

# Kill any process running on the dashboard port
echo "Checking for processes on port $DASHBOARD_PORT..."
pid=$(lsof -ti:$DASHBOARD_PORT)
if [ -n "$pid" ]; then
  echo "Killing process $pid on port $DASHBOARD_PORT"
  kill -9 $pid
else
  echo "No process found on port $DASHBOARD_PORT"
fi

# Clear npm cache
echo "Clearing npm cache to ensure a clean start..."
npm cache clean --force

# Update the .env file
echo "Updating API configuration in .env file..."
cat > .env << EOL
REACT_APP_API_URL=http://localhost:${API_PORT}/api
REACT_APP_RAG_API_URL=http://localhost:3003/api
REACT_APP_VERSION=0.1.0
REACT_APP_USE_MOCK_DATA=false
REACT_APP_ENV=development
REACT_APP_CACHE_BUSTER=$(date +%s)
EOL

echo "API configuration updated. New settings:"
cat .env

echo "Starting dashboard with updated configuration..."
BROWSER=none npm start 