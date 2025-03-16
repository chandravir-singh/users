const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const { upload, gfs } = require("../storage");  // Import the updated storage
const dotenv = require("dotenv");

dotenv.config();
const router = express.Router();

// Set up MongoDB connection
const conn = mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Initialize GridFS
let gfs;
conn.once("open", () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("uploads");
});

// Multer Storage Engine
const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => {
        return {
            filename: `${Date.now()}-${file.originalname}`,
            bucketName: "uploads", // Must match the collection name
        };
    },
});

const upload = multer({ storage });

// 🔹 Upload File
router.post("/upload", upload.single("file"), (req, res) => {
    res.json({ file: req.file, message: "File uploaded successfully" });
});

// 🔹 Get All Files
router.get("/files", async (req, res) => {
    const files = await gfs.files.find().toArray();
    if (!files || files.length === 0) {
        return res.status(404).json({ message: "No files found" });
    }
    res.json(files);
});

// 🔹 Get Single File by Filename
router.get("/files/:filename", async (req, res) => {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: "File not found" });

    res.json(file);
});

// 🔹 Download File
router.get("/download/:filename", async (req, res) => {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).json({ message: "File not found" });

    const readStream = gfs.createReadStream(file.filename);
    readStream.pipe(res);
});

module.exports = router;
