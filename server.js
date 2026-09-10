const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AWS S3 Configuration
const s3 = new AWS.S3({
    region: 'eu-north-1',
    accessKeyId: 'AKIAXQ7HHUFVJD7VMFJI',
    secretAccessKey: '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'
});

const BUCKET_NAME = 'squid-vibe-storage-2026';

let db = {
    videos: [],
    users: {}
};

// 1. Instagram Style Pre-signed URL Generator (Direct Cloud Upload - No Server Lag)
app.post('/api/get-upload-url', async (req, res) => {
    try {
        const { filename } = req.body;
        const key = `uploads/${Date.now()}_${filename}`;
        
        const s3Params = {
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: 'video/mp4',
            Expires: 300
        };

        const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
        res.json({ success: true, uploadUrl, fileKey: key });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Fetch All Videos with CDN URL
app.get('/api/videos', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'uploads/' }).promise();
        let videos = data.Contents.map(item => {
            if (item.Key === 'uploads/') return null;
            const url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${item.Key}`;
            
            // Find or init meta
            let meta = db.videos.find(v => v.file_name === item.Key) || { file_name: item.Key, likes: 0, comments: [] };
            return {
                file_name: item.Key,
                url: url,
                likes: meta.likes,
                comments: meta.comments
            };
        }).filter(Boolean);

        res.json({ success: true, videos });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Like System
app.post('/api/like', (req, res) => {
    const { file_name } = req.body;
    let vid = db.videos.find(v => v.file_name === file_name);
    if (!vid) {
        vid = { file_name, likes: 1, comments: [] };
        db.videos.push(vid);
    } else {
        vid.likes += 1;
    }
    res.json({ success: true, likes: vid.likes });
});

// 4. Comment System
app.post('/api/comment', (req, res) => {
    const { file_name, comment } = req.body;
    let vid = db.videos.find(v => v.file_name === file_name);
    if (!vid) {
        vid = { file_name, likes: 0, comments: [comment] };
        db.videos.push(vid);
    } else {
        vid.comments.push(comment);
    }
    res.json({ success: true, comments: vid.comments });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Squid Vibe Pro Server running on port ${PORT}`));
