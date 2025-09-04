const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Function to get video info using yt-dlp
const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        // We use --dump-json to get video details without downloading
        const command = `yt-dlp --dump-json ${url}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return reject(new Error('Failed to fetch video info. Invalid URL?'));
            }
            try {
                const videoInfo = JSON.parse(stdout);
                // Find a suitable format (e.g., mp4, 720p or less)
                const format = videoInfo.formats.find(f => 
                    f.ext === 'mp4' && f.height && f.height <= 720
                ) || videoInfo.formats.find(f => f.ext === 'mp4');
                
                if (!format) {
                    return reject(new Error('No suitable MP4 format found.'));
                }

                resolve({
                    title: videoInfo.title,
                    downloadUrl: format.url // The direct download link!
                });
            } catch (e) {
                reject(new Error('Could not parse video information.'));
            }
        });
    });
};

// The API endpoint
app.post('/download', async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const videoDetails = await getVideoInfo(youtubeUrl);
        res.json({
            status: 'success',
            ...videoDetails
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
