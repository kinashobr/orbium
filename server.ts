import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  // Parse CLI args (--port, --host) or environment variables
  const portArgIdx = process.argv.indexOf("--port");
  const portFromArg = portArgIdx !== -1 ? parseInt(process.argv[portArgIdx + 1], 10) : NaN;
  const PORT = !isNaN(portFromArg) ? portFromArg : (Number(process.env.DEFAULT_APP_PORT) || 3000);

  const hostArgIdx = process.argv.indexOf("--host");
  const HOST = hostArgIdx !== -1 ? process.argv[hostArgIdx + 1] : "0.0.0.0";

  app.use(express.json());

  // Health check endpoint for container probes
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy" });
  });

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

  // API Route for Pluggy Open Finance data proxying
  app.all("/api/pluggy/data", async (req, res) => {
    try {
      const action = ((req.body?.action || req.query?.action) as string || "").trim();
      const customClientId = ((req.body?.clientId || req.query?.clientId) as string || "").trim();
      const customClientSecret = ((req.body?.clientSecret || req.query?.clientSecret) as string || "").trim();

      const clientId = customClientId || process.env.PLUGGY_CLIENT_ID;
      const clientSecret = customClientSecret || process.env.PLUGGY_CLIENT_SECRET;

      const { fetchPluggyDataFromApi, testPluggyAuth } = await import("./api/pluggy/data.js").catch(() => import("./api/pluggy/data.ts"));

      if (action === "test-auth") {
        if (!clientId || !clientSecret) {
          return res.status(400).json({
            success: false,
            error: "Preencha o Client ID e Client Secret para testar a autenticação.",
            logs: [`[${new Date().toLocaleTimeString()}] [ERRO] CLIENT_ID ou CLIENT_SECRET não informados.`]
          });
        }
        const authResult = await testPluggyAuth(clientId, clientSecret);
        return res.status(authResult.success ? 200 : 401).json(authResult);
      }

      const itemId = ((req.body?.itemId || req.query?.itemId) as string || "").trim();
      if (!itemId) {
        return res.status(400).json({ 
          error: 'O parâmetro ITEM_ID é obrigatório.',
          logs: [`[${new Date().toLocaleTimeString()}] [ERRO] Informe o identificador ITEM_ID da conexão bancária.`]
        });
      }

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          error: 'Credenciais da Pluggy não configuradas. Configure as variáveis PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel.',
          logs: [
            `[${new Date().toLocaleTimeString()}] [ERRO] Variáveis de ambiente da Pluggy não configuradas no servidor.`,
            `[${new Date().toLocaleTimeString()}] Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no painel da Vercel.`
          ]
        });
      }

      const realData = await fetchPluggyDataFromApi(itemId, clientId, clientSecret);
      return res.status(200).json(realData);
    } catch (error: any) {
      console.error('Pluggy Proxy Error:', error);
      return res.status(500).json({ 
        error: error.message || 'Erro interno ao consultar Pluggy API',
        logs: error.logs || [`[${new Date().toLocaleTimeString()}] [ERRO FATAL] ${error.message || 'Erro inesperado'}`]
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
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

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
