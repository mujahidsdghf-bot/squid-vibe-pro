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

// Delete Video API from AWS S3
app.post('/api/delete', async (req, res) => {
    try {
        const { file_name } = req.body;
        const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: file_name
        };
        await s3.deleteObject(deleteParams).promise();
        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/videos', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'uploads/' }).promise();
        let videos = data.Contents.map(item => {
            if (item.Key === 'uploads/') return null;
            const url = `https://${BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${item.Key}`;
            return { file_name: item.Key, url: url };
        }).filter(Boolean);

        res.json({ success: true, videos });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
