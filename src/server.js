const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

// Tempat untuk menyimpan status kerja (jobs) buat sementara waktu
const jobs = {};

const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        const command = `./yt-dlp --cookies cookies.txt --dump-json ${url}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`stderr: ${stderr}`);
                return reject(new Error('Failed to fetch video info.'));
            }
            try {
                const videoInfo = JSON.parse(stdout);
                const format = videoInfo.formats.find(f => 
                    f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none' && f.height && f.height <= 720
                ) || videoInfo.formats.find(f => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none');
                
                if (!format) return reject(new Error('No suitable MP4 format found.'));
                resolve({ title: videoInfo.title, downloadUrl: format.url });
            } catch (e) {
                reject(new Error('Could not parse video information.'));
            }
        });
    });
};

// Laluan 1: Untuk meminta muat turun
app.post('/request-download', (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    const jobId = crypto.randomBytes(8).toString('hex');
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Mulakan proses di latar belakang tanpa menunggu
    getVideoInfo(youtubeUrl)
        .then(videoDetails => {
            jobs[jobId] = { status: 'completed', ...videoDetails };
        })
        .catch(error => {
            jobs[jobId] = { status: 'failed', message: error.message };
        });

    // Hantar jobId kembali serta-merta
    res.json({ jobId });
});

// Laluan 2: Untuk menyemak status
app.get('/get-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs[jobId];

    if (!job) {
        return res.status(404).json({ status: 'not_found' });
    }
    
    // Hantar status kerja kembali
    res.json(job);
    
    // Padam kerja selepas ia diambil untuk menjimatkan memori
    if (job.status === 'completed' || job.status === 'failed') {
        delete jobs[jobId];
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

