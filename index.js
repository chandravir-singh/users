const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const crypto = require("crypto");
const path = require("path");

require("dotenv").config();

const app = express();


// // User Routes
const userRoutes = require("./routes/userRoutes");
app.use("/users", userRoutes);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const conn = mongoose.connection;
let gfs;

conn.once("open", () => {
    gfs = new GridFSBucket(conn.db, { bucketName: "uploads" });
    console.log("📂 GridFS Initialized");
});

// Multer setup for file storage in memory before upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload route
app.post("/uploads/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileName = `${crypto.randomBytes(16).toString("hex")}${path.extname(req.file.originalname)}`;
    
    const uploadStream = gfs.openUploadStream(fileName, {
        contentType: req.file.mimetype
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", () => {
        res.json({ filename: fileName, message: "File uploaded successfully" });
    });

    uploadStream.on("error", (err) => {
        res.status(500).json({ message: "Error uploading file", error: err.message });
    });
});

// Get all files
app.get("/uploads/files", async (req, res) => {
    if (!gfs) return res.status(500).json({ message: "GFS not initialized" });

    const files = await gfs.find().toArray();
    res.json(files);
});

// Download file by filename
app.get("/uploads/file/:filename", async (req, res) => {
    if (!gfs) return res.status(500).json({ message: "GFS not initialized" });

    const file = await gfs.find({ filename: req.params.filename }).toArray();
    if (!file || file.length === 0) return res.status(404).json({ message: "File not found" });

    gfs.openDownloadStreamByName(req.params.filename).pipe(res);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));




// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const multer = require("multer");
// const { GridFsStorage } = require("multer-gridfs-storage");
// const Grid = require("gridfs-stream");
// const crypto = require("crypto");
// const path = require("path");

// dotenv.config();
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Connect to MongoDB
// const conn = mongoose.createConnection(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

// let gfs;
// conn.once("open", () => {
//     gfs = Grid(conn.db, mongoose.mongo);
//     gfs.collection("pdfs");
//     console.log("✅ GridFS initialized");
// });

// // Storage Engine for PDF Uploads
// const storage = new GridFsStorage({
//     url: process.env.MONGO_URI,
//     options: { useUnifiedTopology: true },
//     file: (req, file) => {
//         return new Promise((resolve, reject) => {
//             crypto.randomBytes(16, (err, buf) => {
//                 if (err) return reject(err);
//                 const filename = buf.toString("hex") + path.extname(file.originalname);
//                 const fileInfo = { filename, bucketName: "pdfs" };
//                 resolve(fileInfo);
//             });
//         });
//     }
// });

// const upload = multer({ storage });

// // 🔹 Upload PDF API
// app.post("/upload", upload.single("file"), (req, res) => {
//     res.json({ file: req.file, message: "✅ PDF uploaded successfully" });
// });

// // 🔹 Get All PDFs API
// app.get("/files", async (req, res) => {
//     const files = await gfs.files.find().toArray();
//     res.json(files);
// });

// // 🔹 Get Single PDF API
// app.get("/files/:filename", async (req, res) => {
//     const file = await gfs.files.findOne({ filename: req.params.filename });
//     if (!file) return res.status(404).json({ message: "❌ File not found" });
//     res.json(file);
// });

// // 🔹 Stream PDF for Viewing
// app.get("/view/:filename", async (req, res) => {
//     const file = await gfs.files.findOne({ filename: req.params.filename });
//     if (!file) return res.status(404).json({ message: "❌ File not found" });

//     const readStream = gfs.createReadStream(file.filename);
//     res.set("Content-Type", "application/pdf");
//     readStream.pipe(res);
// });

// // User Routes
// const userRoutes = require("./routes/userRoutes");
// app.use("/users", userRoutes);

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
