#!/bin/bash

# Define the port
PORT=3000

echo "Starting dashboard with API URL: ${REACT_APP_API_URL}"

# Kill any process running on the specified port
echo "Checking for processes on port $PORT..."
pid=$(lsof -ti:$PORT)
if [ -n "$pid" ]; then
  echo "Killing process $pid on port $PORT"
  kill -9 $pid
else
  echo "No process found on port $PORT"
fi

# Set environment variables
export REACT_APP_API_URL=http://localhost:3001/api
export REACT_APP_RAG_API_URL=http://localhost:3003/api
export REACT_APP_USE_MOCK_DATA=false

# Start the React application
echo "Starting dashboard application..."
npm start 