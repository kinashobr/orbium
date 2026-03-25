import { PluggyClient } from 'pluggy-sdk';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Atualizado para buscar os nomes corretos configurados na Vercel
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
    const { clientUserId } = req.body || { clientUserId: 'default_user' };
    const connectToken = await pluggy.createConnectToken({
      clientUserId,
    });

    return res.status(200).json({ accessToken: connectToken.accessToken });
  } catch (error) {
    console.error("Pluggy API Error:", error);
    return res.status(500).json({ error: 'Failed to create connect token' });
  }
}