export interface PluggyIdentity {
  id: string;
  itemId: string;
  fullName: string;
  taxNumber: string;
  documentType: string;
  emails: string[];
  phoneNumbers: string[];
  institutionName?: string;
  createdAt: string;
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: string;
  name: string;
  number: string;
  agency?: string;
  balance: number;
  currencyCode: string;
  bankData?: {
    name: string;
    primaryColor?: string;
    logo?: string;
  };
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  type?: 'DEBIT' | 'CREDIT';
  status?: 'POSTED' | 'PENDING';
  operationType?: string;
}

export interface PluggySyncPayload {
  identity: PluggyIdentity | null;
  accounts: PluggyAccount[];
  bills: any[];
  investments: any[];
  transactions: Record<string, PluggyTransaction[]>;
  isSandboxOrDemo?: boolean;
  logs?: string[];
  rawResponse?: Record<string, any>;
}

export const config = {
  runtime: 'edge',
};


export async function testPluggyAuth(
  clientId: string,
  clientSecret: string
): Promise<{
  success: boolean;
  apiKeyPreview?: string;
  connectorsSample?: string;
  error?: string;
  logs: string[];
  rawResponse?: any;
}> {
  const logs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    logs.push(`[${time}] ${msg}`);
  };

  log(`[TESTE AUTH] Verificando credenciais na Pluggy API (https://api.pluggy.ai/auth)...`);
  log(`[TESTE AUTH] Client ID informado: ${clientId.substring(0, 8)}... (Secret: ${clientSecret.length} caracteres)`);

  const startTime = Date.now();
  try {
    const authRes = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    const elapsed = Date.now() - startTime;
    const resText = await authRes.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(resText);
    } catch {
      // not json
    }

    if (!authRes.ok) {
      log(`[ERRO HTTP ${authRes.status}] Falha de autenticação na Pluggy (${elapsed}ms): ${resText}`);
      return {
        success: false,
        error: resJson?.message || `Falha de autenticação na Pluggy (HTTP ${authRes.status})`,
        logs,
        rawResponse: resJson || resText,
      };
    }

    const apiKey = resJson?.apiKey || "";
    log(`[SUCESSO 200] Autenticação válida! ApiKey gerada em ${elapsed}ms (válida por 2 horas).`);
    log(`[INFO] Chave API emitida: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 6)}`);

    let connectorsSample = "";
    try {
      log(`[PLUGGY] Testando permissão de leitura de conectores (GET /connectors?countries=BR)...`);
      const connRes = await fetch("https://api.pluggy.ai/connectors?countries=BR", {
        headers: { "X-API-KEY": apiKey }
      });
      if (connRes.ok) {
        const connData = await connRes.json();
        const total = connData?.total || connData?.results?.length || 0;
        const sampleNames = (connData?.results || []).slice(0, 6).map((c: any) => c.name).join(", ");
        connectorsSample = sampleNames;
        log(`[SUCESSO 200] Acesso confirmado! ${total} conectores bancários disponíveis (ex: ${sampleNames}).`);
      }
    } catch (connErr: any) {
      log(`[AVISO] Verificação de conectores: ${connErr.message}`);
    }

    log(`[PRONTO] Suas credenciais estão corretas e ativas na Pluggy! Você pode inserir o ITEM_ID e puxar dados reais.`);
    return {
      success: true,
      apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
      connectorsSample,
      logs,
      rawResponse: resJson,
    };
  } catch (err: any) {
    log(`[ERRO CONEXÃO] Falha ao contatar a API da Pluggy: ${err.message}`);
    return {
      success: false,
      error: err.message,
      logs,
    };
  }
}

export async function fetchPluggyDataFromApi(
  itemId: string,
  clientId: string,
  clientSecret: string
): Promise<PluggySyncPayload> {
  const logs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    logs.push(`[${time}] ${msg}`);
  };

  log(`Iniciando comunicação com Pluggy API (https://api.pluggy.ai)...`);
  log(`Utilizando Client ID: ${clientId.substring(0, 8)}... (Tamanho secret: ${clientSecret.length} caracteres)`);

  // 1. Obter ApiKey na Pluggy
  const startTimeAuth = Date.now();
  let apiKey = "";
  try {
    const authResponse = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    const elapsedAuth = Date.now() - startTimeAuth;
    if (!authResponse.ok) {
      const errText = await authResponse.text();
      log(`[ERRO HTTP ${authResponse.status}] Falha ao autenticar na Pluggy (${elapsedAuth}ms): ${errText}`);
      const err = new Error(`Falha de autenticação na Pluggy (HTTP ${authResponse.status}): ${errText}`);
      (err as any).logs = logs;
      throw err;
    }

    const authJson = await authResponse.json();
    apiKey = authJson.apiKey;
    log(`[SUCESSO 200] ApiKey obtida com sucesso em ${elapsedAuth}ms! Token temporário ativo.`);
  } catch (err: any) {
    if (!logs.some(l => l.includes("ERRO"))) {
      log(`[ERRO DE CONEXÃO] Não foi possível alcançar https://api.pluggy.ai/auth: ${err.message}`);
    }
    err.logs = logs;
    throw err;
  }

  const headers = {
    "X-API-KEY": apiKey,
    "Content-Type": "application/json",
  };

  const rawResponsesCollector: Record<string, any> = {};

  // 2. Buscar Contas Bancárias
  log(`Consultando contas bancárias vinculadas ao Item ID: ${itemId} (GET /accounts)...`);
  const accountsStart = Date.now();
  const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${encodeURIComponent(itemId)}`, { headers });
  const accountsData = accountsRes.ok ? await accountsRes.json() : { results: [] };
  rawResponsesCollector.accounts = accountsData;
  log(`[HTTP ${accountsRes.status}] ${accountsData.results?.length || 0} contas encontradas (${Date.now() - accountsStart}ms).`);

  const accounts: PluggyAccount[] = (accountsData.results || []).map((acc: any) => ({
    id: acc.id,
    itemId: acc.itemId,
    type: acc.type,
    name: acc.name,
    number: acc.number || acc.accountNumber,
    agency: acc.agency,
    balance: acc.balance,
    currencyCode: acc.currencyCode || "BRL",
    bankData: acc.bankData,
  }));

  // 3. Buscar Identidade (se suportado pelo conector)
  let identity: PluggyIdentity | null = null;
  log(`Consultando dados de titularidade e identidade (GET /identity)...`);
  try {
    const identRes = await fetch(`https://api.pluggy.ai/identity?itemId=${encodeURIComponent(itemId)}`, { headers });
    if (identRes.ok) {
      const idData = await identRes.json();
      rawResponsesCollector.identity = idData;
      identity = {
        id: idData.id || `ident_${itemId}`,
        itemId,
        fullName: idData.fullName || idData.name || "Titular Não Identificado",
        taxNumber: idData.taxNumber || idData.document || "Não informado",
        documentType: idData.documentType || "CPF",
        emails: idData.emails?.map((e: any) => typeof e === 'string' ? e : e.value) || [],
        phoneNumbers: idData.phoneNumbers?.map((p: any) => typeof p === 'string' ? p : p.value) || [],
        createdAt: idData.createdAt || new Date().toISOString(),
      };
      log(`[HTTP 200] Titular identificado: ${identity.fullName} (${identity.taxNumber}).`);
    } else {
      log(`[INFO HTTP ${identRes.status}] Conector não retornou dados de identidade cadastral.`);
    }
  } catch (e: any) {
    log(`[AVISO] Falha ao consultar endpoint de identidade: ${e.message}`);
  }

  // 4. Buscar Transações para cada conta
  const transactions: Record<string, PluggyTransaction[]> = {};

  for (const account of accounts) {
    log(`Consultando extrato da conta ${account.name} (GET /transactions?pageSize=50)...`);
    try {
      const txRes = await fetch(`https://api.pluggy.ai/transactions?accountId=${encodeURIComponent(account.id)}&pageSize=50`, { headers });
      if (txRes.ok) {
        const txData = await txRes.json();
        rawResponsesCollector[`transactions_${account.id}`] = txData;
        const txList = (txData.results || []).map((t: any) => ({
          id: t.id,
          accountId: account.id,
          description: t.description || t.descriptionRaw,
          amount: t.amount,
          date: t.date,
          category: t.category,
          type: t.type,
          status: t.status,
          operationType: t.operationType,
        }));
        transactions[account.id] = txList;
        log(`[HTTP 200] ${txList.length} transações recentes extraídas com sucesso para ${account.name}.`);
      }
    } catch (err: any) {
      log(`[AVISO] Erro ao consultar transações da conta ${account.id}: ${err.message}`);
    }
  }

  log(`Processamento concluído com êxito! Contas, identidade e transações sincronizadas.`);

  return {
    identity,
    accounts,
    bills: [],
    investments: [],
    transactions,
    isSandboxOrDemo: false,
    logs,
    rawResponse: rawResponsesCollector,
  };
}

// Handler para Vercel Serverless Function
export default async function handler(request: Request) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let itemId = "";
    let customClientId = "";
    let customClientSecret = "";
    let action = "";

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      itemId = (body.itemId || "").trim();
      customClientId = (body.clientId || "").trim();
      customClientSecret = (body.clientSecret || "").trim();
      action = (body.action || "").trim();
    } else {
      const url = new URL(request.url);
      itemId = (url.searchParams.get("itemId") || "").trim();
      customClientId = (url.searchParams.get("clientId") || "").trim();
      customClientSecret = (url.searchParams.get("clientSecret") || "").trim();
      action = (url.searchParams.get("action") || "").trim();
    }

    const clientId = customClientId || process.env.PLUGGY_CLIENT_ID;
    const clientSecret = customClientSecret || process.env.PLUGGY_CLIENT_SECRET;

    if (action === "test-auth") {
      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({
          success: false,
          error: "Preencha o Client ID e Client Secret para testar a autenticação.",
          logs: [`[${new Date().toLocaleTimeString()}] [ERRO] CLIENT_ID ou CLIENT_SECRET não informados.`]
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const authRes = await testPluggyAuth(clientId, clientSecret);
      return new Response(JSON.stringify(authRes), {
        status: authRes.success ? 200 : 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!itemId) {
      return new Response(JSON.stringify({ 
        error: 'O parâmetro ITEM_ID é obrigatório.',
        logs: [`[${new Date().toLocaleTimeString()}] [ERRO] Informe o identificador ITEM_ID da conexão bancária.`]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: 'Credenciais da Pluggy não configuradas. Configure as variáveis PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel.',
        logs: [
          `[${new Date().toLocaleTimeString()}] [ERRO] Variáveis de ambiente da Pluggy não configuradas no servidor.`,
          `[${new Date().toLocaleTimeString()}] Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no painel da Vercel.`
        ]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const realData = await fetchPluggyDataFromApi(itemId, clientId, clientSecret);
    return new Response(JSON.stringify(realData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Pluggy Proxy Error]:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno ao consultar Pluggy API',
      logs: error.logs || [`[${new Date().toLocaleTimeString()}] [ERRO FATAL] ${error.message || 'Erro inesperado'}`]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
