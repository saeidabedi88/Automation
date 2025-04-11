#!/bin/bash

# Default API port
API_PORT=${1:-3001}

echo "Checking if API is accessible on port $API_PORT..."

# Try to connect to the API health endpoint
response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:$API_PORT/api/health)

if [ "$response" = "200" ]; then
  echo "✅ API is accessible on port $API_PORT"
  
  # Get the actual response to show more details
  echo "API health response:"
  curl -s http://localhost:$API_PORT/api/health | json_pp
else
  echo "❌ API is NOT accessible on port $API_PORT (HTTP code: $response)"
  
  # Try to check what might be running on that port
  echo "Process using port $API_PORT:"
  lsof -i :$API_PORT
  
  # Check if Docker containers are running
  echo "Docker container status:"
  docker ps | grep -E "conductor|email"
fi

# Try RAG API port as well
RAG_PORT=3003
echo -e "\nChecking if RAG API is accessible on port $RAG_PORT..."
rag_response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:$RAG_PORT/api/health)

if [ "$rag_response" = "200" ]; then
  echo "✅ RAG API is accessible on port $RAG_PORT"
else
  echo "❌ RAG API is NOT accessible on port $RAG_PORT (HTTP code: $rag_response)"
fi

echo -e "\nMake sure Docker services are running with:"
echo "./restart-services.sh" 