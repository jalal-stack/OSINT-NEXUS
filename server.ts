import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Maltego Transform Endpoint
  app.post("/api/maltego/transform", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).send("GEMINI_API_KEY not configured");
      }

      // Maltego sends XML, but for simplicity we'll support a JSON request too
      // or just extract the value from the XML if we want to be strict.
      // For now, let's assume a simple JSON structure or a 'target' query param for testing.
      const target = req.body.target || req.query.target;
      const type = req.body.type || req.query.type || 'nickname';

      if (!target) {
        return res.status(400).send("Target is required");
      }

      const callGeminiWithRetry = async (prompt: string, maxRetries = 3): Promise<any> => {
        let lastError: any;
        for (let i = 0; i < maxRetries; i++) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: { responseMimeType: "application/json" }
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
              console.log(`[Server] Gemini Rate Limit. Retrying in ${waitTime}ms...`);
              await new Promise(r => setTimeout(r, waitTime));
              continue;
            }
            throw error;
          }
        }
        throw lastError;
      };

      const prompt = `Perform a ${type} OSINT analysis for the target: "${target}". 
        Extract all found entities (emails, phone numbers, usernames, social media profiles).
        Return ONLY a JSON array of objects with "type" (email, phone, username, profile) and "value".
        Example: [{"type": "email", "value": "test@example.com"}]`;

      const response = await callGeminiWithRetry(prompt);

      const entities = JSON.parse(response.text || "[]");

      // Generate Maltego XML
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MaltegoMessage>
  <MaltegoTransformResponseMessage>
    <Entities>`;

      entities.forEach((ent: any) => {
        let maltegoType = "maltego.Phrase";
        if (ent.type === 'email') maltegoType = "maltego.EmailAddress";
        if (ent.type === 'phone') maltegoType = "maltego.PhoneNumber";
        if (ent.type === 'username') maltegoType = "maltego.Alias";
        if (ent.type === 'profile') maltegoType = "maltego.Website";

        xml += `
      <Entity Type="${maltegoType}">
        <Value>${ent.value}</Value>
      </Entity>`;
      });

      xml += `
    </Entities>
  </MaltegoTransformResponseMessage>
</MaltegoMessage>`;

      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("Maltego Transform Error:", error);
      res.status(500).send("Internal Server Error");
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
