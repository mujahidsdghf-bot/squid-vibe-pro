const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const s3 = new AWS.S3({
    region: 'eu-north-1',
    accessKeyId: 'AKIAXQ7HHUFVJD7VMFJI',
    secretAccessKey: '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'
});

const BUCKET_NAME = 'squid-vibe-storage-2026';

// Upload URL with Privacy & Adult Content Filter Check
app.post('/api/get-upload-url', async (req, res) => {
    try {
        const { filename, privacy } = req.body;
        
        // Anti-NSFW / Adult Content keyword check restriction
        const lowerName = filename.toLowerCase();
        const restrictedWords = ['porn', 'sex', 'adult', 'xxx', 'nsfw', 'bubu'];
        if(restrictedWords.some(word => lowerName.includes(word))) {
            return res.status(400).json({ success: false, error: "Adult/NSFW content is strictly restricted!" });
        }

        const cleanName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const key = `uploads/${Date.now()}_${privacy || 'public'}_${cleanName}`;
        
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

// Fetch Feed Videos
app.get('/api/videos', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'uploads/' }).promise();
        let videos = data.Contents.map(item => {
            if (item.Key === 'uploads/') return null;
            const isVideo = /\.(mp4|mov|webm|m4v|avi)$/i.test(item.Key);
            if (!isVideo) return null;

            const isPrivate = item.Key.includes('_private_');
            if(isPrivate) return null; // Hide private posts from public feed

            const url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${item.Key}`;
            return { file_name: item.Key, url: url, privacy: 'Public' };
        }).filter(Boolean);

        res.json({ success: true, videos });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Squid Vibe Pro running on port ${PORT}`));
