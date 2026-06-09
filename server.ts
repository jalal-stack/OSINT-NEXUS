import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

const app = express();

app.use(cors());

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") return null;
  return key;
};

async function callGemini(prompt: string, options: { useSearch?: boolean, responseMimeType?: string } = {}, maxRetries = 3) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured or invalid placeholder used");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const config: any = {};
      if (options.useSearch) {
        config.tools = [{ googleSearch: {} }];
      }
      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isRateLimit = 
        error.message?.includes('429') || 
        error.status === 429 || 
        errorStr.includes('429') || 
        errorStr.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit) {
        const waitTime = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.log(`[Gemini] Rate Limit reached. Retrying in ${Math.round(waitTime)}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      // If it's an invalid key error, don't retry
      if (errorStr.includes('API_KEY_INVALID') || error.status === 400) {
        console.error("[Gemini] Fatal Error (Invalid API Key):", error.message || error);
        throw error;
      }

      throw error;
    }
  }
  throw lastError;
}

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  // Status Endpoint
  app.get("/api/status", (req, res) => {
    const apiKey = getApiKey();
    res.json({ 
      configured: !!apiKey,
      message: apiKey ? "Gemini API key is configured." : "Gemini API key is missing. Please add it to Secrets in Settings."
    });
  });

  // Gemini Proxy Endpoint
  app.post("/api/scan", async (req, res) => {
    try {
      const { prompt, useSearch } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await callGemini(prompt, { useSearch });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      const status = error.status || 500;
      const message = error.message || "Internal Server Error";
      res.status(status).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start listening if we're not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
