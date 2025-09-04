const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Gantikan keseluruhan fungsi getVideoInfo dalam src/server.js

const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        // PERUBAHAN UTAMA DI SINI: Kita tambah './' untuk memberitahu sistem 
        // supaya mencari yt-dlp di direktori semasa.
        const command = `./yt-dlp --dump-json ${url}`; 
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                // Sertakan stderr untuk maklumat debug yang lebih baik
                console.error(`stderr: ${stderr}`);
                return reject(new Error('Failed to fetch video info. The service may be warming up.'));
            }
            try {
                const videoInfo = JSON.parse(stdout);
                const format = videoInfo.formats.find(f => 
                    f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none' && f.height && f.height <= 720
                ) || videoInfo.formats.find(f => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none');
                
                if (!format) {
                    return reject(new Error('No suitable MP4 format with both video and audio found.'));
                }

                resolve({
                    title: videoInfo.title,
                    downloadUrl: format.url
                });
            } catch (e) {
                console.error('JSON Parsing Error:', e);
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

