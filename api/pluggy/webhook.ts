import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.body;
  console.log("Webhook recebido da Pluggy:", event.event, "Item:", event.itemId);

  // Aqui você pode adicionar lógica para disparar sincronizações
  // ou atualizar o status do item no seu banco de dados.
  
  return res.status(200).json({ received: true });
}