import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import Groq from 'groq-sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());

// Disable caching for all responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running', hasGroqKey: !!process.env.GROQ_API_KEY });
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        const symptoms = req.body.symptoms || '';
        const hasImage = !!req.file;
        
        console.log('Request received:', { symptoms: symptoms.substring(0, 50), hasImage });
        
        if (!symptoms.trim()) {
            return res.status(400).json({ error: 'Please describe your symptoms' });
        }
        
        if (!process.env.GROQ_API_KEY) {
            console.error('GROQ_API_KEY not configured');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }
        
        const imagePrompt = hasImage
            ? 'The user has uploaded an image. Incorporate any relevant visual clues from the image when possible, but do not hallucinate details that are not clearly visible.'
            : '';

        console.log('Calling Groq API...');
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a professional Medical Assistant AI. 
                    Based on the symptoms provided, follow this structure:
                    1. POSSIBLE CAUSES: List 3-4 likely conditions.
                    2. NATURAL REMEDIES: Suggest safe, ayurvedic natural home remedies.
                    3. ACCUPRESSURE POINTS: Recommend specific pressure points for relief.
                    4. MUDRAS: Recommend mudra.
                    5. DOCTOR SUGGESTIONS: Recommend the specific type of doctor to visit (e.g., Dermatologist, ENT).
                    
                },
                { role: "user", content: `Symptoms: ${symptoms}\n${imagePrompt}` }
            ],
            temperature: 0.3,
        });

        console.log('Groq response received');
        res.json({ answer: completion.choices[0].message.content });
    } catch (error) {
        console.error('Error in /analyze:', error.message, error.status);
        const statusCode = error.status || 500;
        const errorMessage = error.message || 'Failed to process request';
        res.status(statusCode).json({ error: errorMessage });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Brain active on port ${PORT}`));
