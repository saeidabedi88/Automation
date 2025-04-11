#!/bin/bash

# Set OpenAI API key
export OPENAI_API_KEY=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

# Get the target email address from environment
TARGET_EMAIL=$(docker-compose exec email-mcp env | grep IMAP_USER | cut -d= -f2)

# If not found, use the default from docker-compose.yml
if [ -z "$TARGET_EMAIL" ]; then
  TARGET_EMAIL="saeid@mnnm.ca"
fi

# Current timestamp for uniqueness
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "Sending test email to $TARGET_EMAIL..."

# Create a temporary file to hold the email content
cat > temp_email.txt << EOL
Subject: Test Email - $TIMESTAMP

This is a test email sent at $TIMESTAMP.

Please process this email through the system.

Best regards,
Email Automation System Test
EOL

# Send the email using mail command (you might need to install mailutils)
if command -v mail > /dev/null; then
  cat temp_email.txt | mail -s "Test Email - $TIMESTAMP" $TARGET_EMAIL
  echo "Email sent using mail command."
else
  # Alternative: use curl and a mail sending service
  echo "Mail command not found. Trying to send via API..."
  
  # Try to use the email-mcp API to send email
  curl -X POST http://localhost:3002/api/emails/send \
    -H "Content-Type: application/json" \
    -d "{\"to\": \"$TARGET_EMAIL\", \"subject\": \"Test Email - $TIMESTAMP\", \"text\": \"This is a test email sent at $TIMESTAMP.\nPlease process this email through the system.\n\nBest regards,\nEmail Automation System Test\"}"
fi

# Clean up
rm temp_email.txt

echo "Test email sent to $TARGET_EMAIL at $TIMESTAMP"
echo "The system should poll for new emails within 60 seconds."
echo "To check for the email, run: ./check-emails.sh" 