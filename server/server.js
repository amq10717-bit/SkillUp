// server/server.js (ESM)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe"; // <--- NEW IMPORT

// --- IMPORTS FOR FILE PATHS ---
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();

// --- DEBUGGING LOG (Add this temporarily) ---
console.log("Stripe Key Status:", process.env.STRIPE_SECRET_KEY ? "Loaded ✅" : "Missing ❌");
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("FATAL ERROR: STRIPE_SECRET_KEY is missing from .env file");
    process.exit(1); // Stop server if key is missing
}
// --- INITIALIZE STRIPE ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// --- SETUP DIRNAME FOR ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// --- STATIC FILE SERVING ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- CLOUDINARY CONFIG ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================================
//  STRIPE PAYMENT ROUTE (NEW)
// ==========================================
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Amount in cents (e.g. 2000 = $20.00)
            currency: currency || 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Send the client secret to the frontend
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).send({ error: error.message });
    }
});

// ==========================================
//  EXISTING CLOUDINARY ROUTES
// ==========================================

// Simple signature endpoint
app.get("/api/cloudinary-signature", (req, res) => {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "assignments";
        const paramsToSign = { timestamp, folder };

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

// Delete by public_id
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

// --- SERVER START ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));