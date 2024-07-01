#!/bin/bash

SERVER="${SERVER:-http://127.0.0.1:3000}"
TOKEN="${TOKEN}"
QR="${QR}"

# Function to display usage
usage() {
    echo "Error: arguments are missing, usage: $0 http://example.com [id]"
    exit 1
}

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo "Error: TOKEN environment variable is not set"
    exit 1
fi

# Check for arguments
if [ "$#" -lt 1 ]; then
    usage
fi

URL="$1"
ID="$2"

# Create request body
DATA="{\"url\":\"$URL\""
if [ -n "$ID" ]; then
    DATA="$DATA, \"id\":\"$ID\""
fi
DATA="$DATA}"

# Headers
HEADERS="Content-Type: application/json"

# Make request to API for submitting the URL
HTTP_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$SERVER" -H "$HEADERS" -H "token: $TOKEN" -d "$DATA")
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed -e 's/HTTPSTATUS\:.*//g')
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

# Check if the server is offline or returned an error
if [ "$HTTP_STATUS" -eq 000 ]; then
    echo "Error: Server is offline or unreachable"
    exit 1
fi

# Check for errors in the response
ERROR=$(echo "$HTTP_BODY" | grep -oP '(?<="error":")[^"]*')
if [ -n "$ERROR" ]; then
    echo "Error: $ERROR"
    exit 1
fi

# Extract and display the ID from the response
ID=$(echo "$HTTP_BODY" | grep -oP '(?<="id":")[^"]*')
URL="${SERVER}/${ID}"

# If we have an ID, display the URL and QR code
if [ -n "$ID" ]; then
    echo $URL
    if [ -n "$QR" ]; then
        if command -v qrcode-terminal &> /dev/null; then
            qrcode-terminal "$URL"
        else
            echo "(install qrcode-terminal to print QR code to console)"
        fi
    fi
else
    # If we don't have an ID, display an error
    echo "Error: Failed to retrieve ID from the response"
    exit 1
fi
