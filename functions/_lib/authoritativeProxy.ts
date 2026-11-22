const AUTHORITATIVE_ORIGIN = 'https://diario.obramatch.com.br';

const ALLOWED_PATHS = new Set([
  '/api/obras/archive',
  '/api/obras/reactivate',
  '/api/storage/delete-photo',
  '/api/diarios/delete',
  '/api/payments/cancel',
]);

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function proxyAuthoritativePost(request: Request, upstreamPath: string): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { message: 'Método não permitido.' });
  }
  if (!ALLOWED_PATHS.has(upstreamPath)) {
    return json(404, { message: 'Rota autoritativa não reconhecida.' });
  }

  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) {
    return json(401, { message: 'Sessão ausente.' });
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json(415, { message: 'Envie os dados em JSON.' });
  }

  const body = await request.text();
  if (!body || body.length > 100_000) {
    return json(body ? 413 : 400, {
      message: body ? 'Solicitação muito grande.' : 'Corpo da solicitação ausente.',
    });
  }

  try {
    JSON.parse(body);
  } catch {
    return json(400, { message: 'JSON inválido.' });
  }

  try {
    const upstream = await fetch(`${AUTHORITATIVE_ORIGIN}${upstreamPath}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-ObraMatch-Client': 'twa-cloudflare-pages',
      },
      body,
    });

    const responseText = await upstream.text();
    const responseContentType = upstream.headers.get('Content-Type') || 'application/json; charset=utf-8';

    return new Response(responseText || JSON.stringify({ success: upstream.ok }), {
      status: upstream.status,
      headers: {
        'Content-Type': responseContentType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Falha no proxy autoritativo:', {
      upstreamPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return json(502, { message: 'O serviço de sincronização está temporariamente indisponível.' });
  }
}


const CENTRAL_ACOES = new Set(['list_assigned_works', 'submit_field_rdo', 'resubmit_field_rdo']);

/** Ponte restrita para a Central: o executante consulta suas obras atribuídas e envia RDOs. */
export async function proxyCentral(request: Request): Promise<Response> {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json(401, { message: 'Sessão ausente.' });

  const url = new URL(request.url);
  let corpo: string | undefined;
  let acao = '';
  if (request.method === 'GET') {
    acao = url.searchParams.get('action') || '';
  } else if (request.method === 'POST') {
    corpo = await request.text();
    if (!corpo || corpo.length > 4_000_000) {
      return json(corpo ? 413 : 400, { message: corpo ? 'Solicitação muito grande.' : 'Corpo da solicitação ausente.' });
    }
    try { acao = String((JSON.parse(corpo) as { action?: unknown }).action || ''); } catch { return json(400, { message: 'JSON inválido.' }); }
  } else {
    return json(405, { message: 'Método não permitido.' });
  }
  if (url.searchParams.get('scope') !== 'central' || !CENTRAL_ACOES.has(acao)) {
    return json(404, { message: 'Ação da Central não reconhecida.' });
  }

  const destino = new URL(`${AUTHORITATIVE_ORIGIN}/api/obras/dispatcher`);
  destino.searchParams.set('scope', 'central');
  if (request.method === 'GET') {
    destino.searchParams.set('action', acao);
    const pagina = url.searchParams.get('pageToken');
    if (pagina) destino.searchParams.set('pageToken', pagina.slice(0, 2000));
  }
  try {
    const upstream = await fetch(destino.toString(), {
      method: request.method,
      redirect: 'manual',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        'X-ObraMatch-Client': 'twa-cloudflare-pages',
      },
      body: corpo,
    });
    const texto = await upstream.text();
    return new Response(texto || JSON.stringify({ success: upstream.ok }), {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Falha no proxy da Central:', error instanceof Error ? error.message : String(error));
    return json(502, { message: 'A Central está temporariamente indisponível.' });
  }
}
