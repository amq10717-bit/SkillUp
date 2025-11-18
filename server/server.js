// server/server.js  (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Simple signature endpoint
app.get("/api/cloudinary-signature", (req, res) => {
    try {
        // timestamp is required for signing
        const timestamp = Math.floor(Date.now() / 1000);

        // Sign the same params that the client will send to Cloudinary
        const folder = "assignments"; // keep in sync with client upload
        const paramsToSign = { timestamp, folder };

        // create signature server-side (uses API secret)
        const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

        res.json({
            timestamp,
            signature,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            folder,
        });
    } catch (err) {
        console.error("Error generating signature:", err);
        res.status(500).json({ error: err.message });
    }
});

// Optional: delete by public_id (server-side, secure)
app.post("/api/delete-cloudinary", async (req, res) => {
    const { public_id } = req.body;
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        res.json(result);
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Cloudinary signature server running on port ${PORT}`));
