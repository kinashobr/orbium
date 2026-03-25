import { PluggyClient } from 'pluggy-sdk';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const pluggy = new PluggyClient({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
  });

  try {
    const { clientUserId } = await req.json();
    const connectToken = await pluggy.createConnectToken({
      clientUserId,
    });

    return new Response(JSON.stringify({ accessToken: connectToken.accessToken }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create connect token' }), { status: 500 });
  }
}