import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier, redirect_uri } = request.body;

  if (!code || !code_verifier || !redirect_uri) {
    return response.status(400).json({ error: 'Missing required parameters' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Environment variables GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are not set');
    return response.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('code_verifier', code_verifier);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirect_uri);

    const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error('Google OAuth error:', data);
      return response.status(googleResponse.status).json(data);
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error('Auth Proxy Error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}