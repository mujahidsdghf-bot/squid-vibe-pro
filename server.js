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

// 1. Generate Pre-signed URL with strict video/mp4 type
app.post('/api/get-upload-url', async (req, res) => {
    try {
        const { filename } = req.body;
        const cleanName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const key = `uploads/${Date.now()}_${cleanName}`;
        
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

// 2. Fetch All Videos from S3
app.get('/api/videos', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'uploads/' }).promise();
        let videos = data.Contents.map(item => {
            if (item.Key === 'uploads/') return null;
            const url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${item.Key}`;
            
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Squid Vibe Pro Server running on port ${PORT}`));
