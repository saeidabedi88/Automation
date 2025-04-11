#!/bin/bash

# Set OpenAI API key
export OPENAI_API_KEY=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

# Default API port
API_PORT=${1:-3001}

echo "Checking for emails via API on port $API_PORT..."
echo "Attempting to fetch emails from the conductor-mcp service..."

# Try to connect to the emails endpoint
response=$(curl -s -o emails.json -w "%{http_code}" http://localhost:$API_PORT/api/emails?page=1&limit=10)

if [ "$response" = "200" ]; then
  echo "✅ Successfully fetched emails from the API"
  
  # Parse and display the retrieved emails
  echo "Emails retrieved:"
  cat emails.json | json_pp
  
  # Count the emails
  email_count=$(cat emails.json | grep -o '"id"' | wc -l)
  echo "Number of emails found: $email_count"
  
  # Check email database directly
  echo -e "\nChecking email database directly via PostgreSQL..."
  docker-compose exec postgres psql -U postgres -d email_automation -c "SELECT id, subject, sender, received_at, status FROM emails ORDER BY received_at DESC LIMIT 10;"
else
  echo "❌ Failed to fetch emails from the API (HTTP code: $response)"
  
  # Try checking the database directly
  echo "Checking email database directly via PostgreSQL..."
  docker-compose exec postgres psql -U postgres -d email_automation -c "SELECT COUNT(*) FROM emails;"
  docker-compose exec postgres psql -U postgres -d email_automation -c "SELECT id, subject, sender, received_at, status FROM emails ORDER BY received_at DESC LIMIT 10;"
fi

# Check for connection to email server (IMAP)
echo -e "\nChecking IMAP server connection..."
docker-compose logs --tail=20 email-mcp | grep -E "IMAP|email|poll" 