import { PluggyClient } from 'pluggy-sdk';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const pluggy = new PluggyClient({
    clientId,
    clientSecret,
  });

  try {
    // Extrai o clientUserId do corpo da requisição ou usa um padrão
    const { clientUserId } = req.body || {};
    const userId = clientUserId || 'default_user';
    
    // O SDK espera apenas a string do clientUserId
    const connectToken = await pluggy.createConnectToken(userId);

    return res.status(200).json({ accessToken: connectToken.accessToken });
  } catch (error) {
    console.error("Pluggy API Error:", error);
    return res.status(500).json({ error: 'Failed to create connect token' });
  }
}