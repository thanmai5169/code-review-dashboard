const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/temp directory exists
const tempDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedExts = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java',
    '.cpp', '.c', '.h', '.cs', '.go', '.rb', '.php', '.html', '.css', '.json'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File extension ${ext} not supported. Allowed formats: ${allowedExts.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter
});

module.exports = upload;
