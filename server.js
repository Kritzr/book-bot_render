// server.js (Full Code)
require('dotenv').config(); 

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000; 
const HF_TOKEN = process.env.HUGGING_FACE_TOKEN; 
// *** REPLACE THIS PLACEHOLDER URL ***
const HF_INFERENCE_URL = "https://router.huggingface.co/fal-ai/fal-ai/qwen-image"; 

// --- MIDDLEWARE SETUP ---
app.use(express.json()); 
app.use(express.static(path.join(__dirname))); 

// --- SECURE API ROUTE ---
app.post('/api/generate', async (req, res) => {
    const { prompt, model, parameters } = req.body; 

    if (!HF_TOKEN) {
        console.error("API key is missing in environment variables.");
        return res.status(500).json({ error: "Server Configuration Error: API key missing." });
    }
    
    try {
        const full_hf_url = HF_INFERENCE_URL + model; // e.g., .../models/FLUX.1-dev

        const hf_response = await fetch(full_hf_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`, 
                "x-use-cache": "false",
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: parameters, 
            }),
        });

        if (hf_response.ok) {
            const contentType = hf_response.headers.get('Content-Type') || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            // Stream the binary image data directly back to the client
            hf_response.body.pipe(res); 
        } else {
            const errorData = await hf_response.json();
            console.error("HF API Error:", hf_response.status, errorData);
            res.status(hf_response.status).json({ 
                error: errorData.error || `Hugging Face API failed with status ${hf_response.status}` 
            });
        }
        
    } catch (error) {
        console.error("Internal Server Error during generation:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running and listening on port ${PORT}`);
});