#!/bin/bash

# Script to launch Chrome with remote debugging enabled
# This allows the deep_research functionality to connect to an existing Chrome instance

# Default values
DEBUG_PORT=9222
USER_DATA_DIR="/tmp/chrome-testing"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --port=*)
      DEBUG_PORT="${1#*=}"
      shift
      ;;
    --user-data-dir=*)
      USER_DATA_DIR="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown parameter: $1"
      echo "Usage: $0 [--port=9222] [--user-data-dir=/tmp/chrome-testing]"
      exit 1
      ;;
  esac
done

echo "Starting Chrome with remote debugging on port $DEBUG_PORT"
echo "Using user data directory: $USER_DATA_DIR"

# Create the user data directory if it doesn't exist
mkdir -p "$USER_DATA_DIR"

# Launch Chrome with remote debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port="$DEBUG_PORT" \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir="$USER_DATA_DIR"

# Note: This script will block until Chrome is closed
# To run in background, you can use: ./start_chrome_debug.sh &