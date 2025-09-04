#!/bin/bash
echo "Installing/Updating yt-dlp..."
# Download the latest yt-dlp binary to the project's root directory
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
# Make it executable
chmod a+rx ./yt-dlp
echo "yt-dlp is ready."