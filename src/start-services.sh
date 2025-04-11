#!/bin/bash

# Start services script for Email Automation Dashboard and RAG Server
# This script starts both the React dashboard and the RAG server simultaneously

# Function to handle script exit
cleanup() {
  echo "Shutting down services..."
  
  # Kill all background processes in this script's process group
  kill $(jobs -p) 2>/dev/null
  
  exit 0
}

# Set the trap for graceful shutdown
trap cleanup EXIT INT TERM

# Set environment variables (can be overridden by .env files in the services)
export NODE_ENV=development

# Print banner
echo "==============================================================="
echo "       Email Automation Dashboard & RAG Server Starter         "
echo "==============================================================="
echo

# First check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

# Print Node.js version information
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Create a function to start the dashboard
start_dashboard() {
  echo
  echo "Starting Email Automation Dashboard..."
  cd src/dashboard || exit 1
  
  # Check if node_modules exists, if not run npm install
  if [ ! -d "node_modules" ]; then
    echo "Installing dashboard dependencies..."
    npm install
  fi
  
  # Start the React development server
  npm start &
  DASHBOARD_PID=$!
  echo "Dashboard started (PID: $DASHBOARD_PID)"
  cd ../..
}

# Create a function to start the RAG server
start_rag_server() {
  echo
  echo "Starting RAG Server..."
  cd src/rag-server || exit 1
  
  # Check if node_modules exists, if not run npm install
  if [ ! -d "node_modules" ]; then
    echo "Installing RAG server dependencies..."
    npm install
  fi
  
  # Start the RAG server in development mode
  npm run dev &
  RAG_PID=$!
  echo "RAG server started (PID: $RAG_PID)"
  cd ../..
}

# Start services
start_dashboard
start_rag_server

echo
echo "All services started successfully!"
echo "- Dashboard: http://localhost:3000"
echo "- RAG API: http://localhost:3003/api"
echo
echo "Press Ctrl+C to stop all services."

# Wait for all background processes
wait 