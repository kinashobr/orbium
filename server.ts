import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Google OAuth proxying (hiding GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { code, code_verifier, redirect_uri, refresh_token, grant_type } = req.body;

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('Environment variables GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      if (grant_type === 'refresh_token' || refresh_token) {
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refresh_token);
      } else {
        if (!code || !code_verifier || !redirect_uri) {
          return res.status(400).json({ error: 'Missing required parameters' });
        }
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('code_verifier', code_verifier);
        params.append('redirect_uri', redirect_uri);
      }

      const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await googleResponse.json();
      res.status(googleResponse.status).json(data);
    } catch (error) {
      console.error('Auth Proxy Error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
