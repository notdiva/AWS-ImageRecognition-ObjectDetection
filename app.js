// Import necessary modules
const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const uploadsPath = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

require('dotenv').config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});


const rekognition = new AWS.Rekognition();

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage }).single('image');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.render('index', { labels: null, error: null, imageUrl: null });
});

app.post('/upload', (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError || err) {
            return res.render('index', { error: 'Upload error', labels: [], imageUrl: null });
        }

        const image = req.file;
        if (image) {
            const imagePath = image.path;
            const imageBuffer = fs.readFileSync(imagePath);

            const params = {
                Image: {
                    Bytes: imageBuffer
                }
            };

            rekognition.detectLabels(params, (err, data) => {
                if (err) {
                    console.error("Rekognition Error:", err.message);
                    res.render('index', { error: 'Error processing image: ' + err.message, labels: [], imageUrl: null });
                } else {
                    const imageUrl = `/uploads/${image.filename}`;
                    res.render('index', { error: null, labels: data.Labels, imageUrl });
                }
            });
        } else {
            res.render('index', { error: 'No image uploaded', labels: [], imageUrl: null });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
