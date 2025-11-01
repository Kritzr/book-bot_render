// server.js (Final Attempt - Swapping node-fetch Import Style)

// 1. IMPORT DEPENDENCIES (ESM)
import express from 'express';
import path from 'path';
import 'dotenv/config'; 
import cors from 'cors';
import { fileURLToPath } from 'url';

// 1b. Use 'require' for node-fetch to avoid common compatibility issues in Node.js
// We use a conditional check to satisfy the linter
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


// Standard way to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Read port from .env (5000) or default (10000)
const PORT = process.env.PORT || 10000; 

// 2. SECURE CONFIGURATION
const HF_TOKEN = process.env.HUGGING_FACE_TOKEN; 
const HF_INFERENCE_URL = "https://api-inference.huggingface.co/models/"; 

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(express.json()); 


// --- SECURE API ROUTE (THE CRITICAL PATH) ---
// This handles the POST request from script.js to http://localhost:5000/api/generate
app.post('/api/generate', async (req, res) => {
    const { prompt, model, parameters } = req.body; 

    // CHECK: Token must be present. If it's missing, return 401.
    if (!HF_TOKEN || HF_TOKEN === "hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
        console.error("API key is missing or is a placeholder.");
        return res.status(401).json({ error: "Configuration Error: Authentication token not set or invalid." });
    }
    
    try {
        const full_hf_url = HF_INFERENCE_URL + model; 

        // 1. Log the attempt to check the server terminal
        console.log(`Forwarding request for model: ${model}`);

        // 2. Execute the fetch request using the promise wrapper
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

        // 3. Handle Response
        if (hf_response.ok) {
            const contentType = hf_response.headers.get('Content-Type') || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            
            // Pipe the stream directly back for efficiency
            hf_response.body.pipe(res); 
        } else {
            // Error: Forward the error status (404, 401, 503) from Hugging Face
            const errorData = await hf_response.json();
            console.error("HF API Error:", hf_response.status, errorData);
            res.status(hf_response.status).json({ 
                error: errorData.error || `Hugging Face API failed with status ${hf_response.status}` 
            });
        }
        
    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// 3. Serve static files (index.html, script.js, style.css) from the root folder
// This must be the LAST routing middleware to ensure the API post is handled first.
app.use(express.static(path.join(__dirname))); 


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running and listening on port ${PORT} (http://localhost:${PORT}/)`);
    console.log(HF_TOKEN ? "API Key Loaded Successfully." : "WARNING: API Key is missing!");
});
