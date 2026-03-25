import { PluggyClient } from 'pluggy-sdk';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("ERRO: PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET não definidos nas variáveis de ambiente.");
    return res.status(500).json({ error: 'Server configuration error: Missing credentials' });
  }

  try {
    const pluggy = new PluggyClient({
      clientId,
      clientSecret,
    });

    const { clientUserId } = req.body || {};
    const userId = clientUserId || 'default_user';
    
    const connectToken = await pluggy.createConnectToken(userId);

    return res.status(200).json({ accessToken: connectToken.accessToken });
  } catch (error) {
    console.error("Pluggy API Error:", error);
    return res.status(500).json({ error: 'Failed to create connect token', details: error instanceof Error ? error.message : String(error) });
  }
}