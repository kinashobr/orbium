export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { code, code_verifier, redirect_uri, refresh_token, grant_type } = body;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Environment variables GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // Se for uma renovação (refresh)
    if (grant_type === 'refresh_token' || refresh_token) {
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refresh_token);
    } 
    // Se for a troca inicial de código
    else {
      if (!code || !code_verifier || !redirect_uri) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
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

    return new Response(JSON.stringify(data), {
      status: googleResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}