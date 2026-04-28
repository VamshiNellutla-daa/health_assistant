import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/analyze', async (req, res) => {
    const { symptoms } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            // Using the 70B model for high-quality medical reasoning
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a professional Medical Assistant AI. 
                    Based on the symptoms provided, follow this structure:
                    1. POSSIBLE CAUSES: List 3-4 likely conditions.
                    2. NATURAL REMEDIES: Suggest safe, science-backed home care.
                    3. SPECIALIST: Recommend the specific type of doctor to visit (e.g., Dermatologist, ENT).
                    4. DISCLAIMER: Always state that you are an AI and not a doctor.`
                },
                { role: "user", content: `Symptoms: ${symptoms}` }
            ],
            temperature: 0.3, // Lower temperature for more factual, stable answers
        });

        res.json({ answer: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: "Failed to connect to Groq" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Brain active on port ${PORT}`));