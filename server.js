import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Menyajikan folder frontend nanti (opsional jika digabung)
app.use(express.static('frontend'));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, mode, webSearch } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key belum diset di server." });
    }

    // Format pesan untuk Gemini
    const contents = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemPrompt = mode === 'coding' 
      ? "You are NEORiTy, a professional coding assistant. Provide clean, idiomatic code. Focus on minimal, precise solutions. Use markdown."
      : "You are NEORiTy, a concise and professional AI assistant. Answer clearly using markdown.";

    const body = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };

    if (webSearch) {
      body.tools = [{ googleSearch: {} }];
    }

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gagal memanggil Gemini API");
    }

    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.map(p => p.text).join('') || "(Empty response)";
    
    const sources = candidate?.groundingMetadata?.groundingChunks?.map(c => ({
      title: c.web?.title,
      url: c.web?.uri
    })).filter(s => s.url);

    res.json({ content, sources });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
