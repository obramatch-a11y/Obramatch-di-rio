// GET /api/diagnostico?secret=SEU_TELEGRAM_SECRET
// Testa cada credencial DE VERDADE e devolve um relatório do que está
// funcionando e do que está quebrado. Não expõe nenhum valor secreto.

import { Env, obterAccessToken, projetoEBanco } from '../_lib/google';

async function listarColecao(env: Env, colecao: string, pageSize: number): Promise<any[]> {
  const token = await obterAccessToken(env);
  const { projectId, dbId } = projetoEBanco(env);
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${colecao}?pageSize=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} ao listar ${colecao}`);
  const json: any = await res.json();
  return json.documents || [];
}

function campo(doc: any, nome: string): string {
  const v = doc?.fields?.[nome];
  return v?.stringValue ?? v?.integerValue ?? (v?.timestampValue || '');
}

export const onRequestGet = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (!env.TELEGRAM_SECRET || url.searchParams.get('secret') !== env.TELEGRAM_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const r: Record<string, string> = {};

  // Faxina controlada: ?apagar_obra=ID apaga uma obra específica
  const apagarObra = url.searchParams.get('apagar_obra');
  if (apagarObra) {
    try {
      const token = await obterAccessToken(env);
      const { projectId, dbId } = projetoEBanco(env);
      const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/obras/${apagarObra}`;
      const info = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
      if (!info.ok) {
        return new Response(JSON.stringify({ resultado: `Obra ${apagarObra} não encontrada (talvez já apagada).` }, null, 2), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      const docJson: any = await info.json();
      const nome = docJson?.fields?.nome?.stringValue || '(sem nome)';
      const del = await fetch(base, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      return new Response(
        JSON.stringify({ resultado: del.ok ? `Obra "${nome}" (${apagarObra}) apagada com sucesso.` : `Falha ao apagar: HTTP ${del.status}` }, null, 2),
        { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    } catch (e: any) {
      return new Response(JSON.stringify({ resultado: 'Erro: ' + String(e?.message || e).slice(0, 180) }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  }

  // 1) Presença das variáveis
  r['1_GEMINI_API_KEY'] = env.GEMINI_API_KEY
    ? `presente (começa com "${env.GEMINI_API_KEY.slice(0, 3)}", ${env.GEMINI_API_KEY.length} caracteres)`
    : 'FALTANDO';
  r['2_TELEGRAM_BOT_TOKEN'] = env.TELEGRAM_BOT_TOKEN ? 'presente' : 'FALTANDO';
  r['3_FIREBASE_WEB_API_KEY'] = env.FIREBASE_WEB_API_KEY ? 'presente' : 'FALTANDO';
  r['4_SUPABASE_URL'] = env.SUPABASE_URL ? 'presente' : 'faltando (fotos usarão modo alternativo)';
  r['5_SUPABASE_SERVICE_KEY'] = env.SUPABASE_SERVICE_KEY ? 'presente' : 'faltando (fotos usarão modo alternativo)';

  // 2) FIREBASE_SERVICE_ACCOUNT é um JSON válido e completo?
  try {
    const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || '');
    if (sa.client_email && sa.private_key && sa.project_id) {
      r['6_FIREBASE_SERVICE_ACCOUNT'] = `JSON ok (projeto ${sa.project_id})`;
    } else {
      r['6_FIREBASE_SERVICE_ACCOUNT'] = 'PROBLEMA: JSON válido mas incompleto (faltam client_email / private_key / project_id)';
    }
  } catch {
    r['6_FIREBASE_SERVICE_ACCOUNT'] = env.FIREBASE_SERVICE_ACCOUNT
      ? 'PROBLEMA: o valor colado NÃO é um JSON válido (foi cortado ou alterado ao colar)'
      : 'FALTANDO';
  }

  // 3) A credencial de serviço autentica no Google de verdade?
  try {
    await obterAccessToken(env);
    r['7_autenticacao_google'] = 'OK — credencial de serviço funciona (Firestore e bot podem gravar)';
  } catch (e: any) {
    r['7_autenticacao_google'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  // 4) O Gemini responde com esta chave? (mesma chamada que o app usa)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Responda apenas: ok' }] }] }),
      }
    );
    if (res.ok) {
      r['8_gemini'] = 'OK — a IA respondeu';
    } else {
      const detalhe = (await res.text()).slice(0, 250);
      r['8_gemini'] = `FALHOU: HTTP ${res.status} — ${detalhe}`;
    }
  } catch (e: any) {
    r['8_gemini'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  // 5) A chave web valida sessões de login? (token falso: 400 = chave ok)
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: 'teste' }) }
    );
    if (res.status === 400) {
      r['9_validacao_de_login'] = 'OK — chave web aceita pelo Google';
    } else {
      const detalhe = (await res.text()).slice(0, 250);
      r['9_validacao_de_login'] = `ATENÇÃO: HTTP ${res.status} — ${detalhe}`;
    }
  } catch (e: any) {
    r['9_validacao_de_login'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  // 6) Raio-X do banco: quais obras e vínculos existem de verdade
  try {
    const { dbId } = projetoEBanco(env);
    const obras = await listarColecao(env, 'obras', 20);
    const usuarios = await listarColecao(env, 'usuarios', 10);
    const obrasDetalhadas = [] as any[];
    for (const d of obras) {
      const id = String(d.name).split('/').pop() as string;
      let diarios: any[] = [];
      try {
        const docs = await listarColecao(env, `obras/${id}/diarios`, 20);
        diarios = docs.map((x: any) => ({
          rdo: campo(x, 'numeroRdo') || '?',
          origem: campo(x, 'origem'),
          data: campo(x, 'data'),
          dono: String(campo(x, 'ownerId')).slice(0, 10) + '...',
        }));
      } catch {
        // sem diários ou erro de listagem
      }
      obrasDetalhadas.push({
        id,
        nome: campo(d, 'nome'),
        dono: String(campo(d, 'ownerId')).slice(0, 10) + '...',
        criadaEm: String(campo(d, 'createdAt')).slice(0, 16),
        diarios,
        diarios_campos_brutos: diarios.length
          ? (await (async () => {
              try {
                const docs = await listarColecao(env, `obras/${id}/diarios`, 5);
                return docs.map((x: any) => ({
                  campos: Object.keys(x.fields || {}),
                  tipo_ownerId: x.fields?.ownerId ? Object.keys(x.fields.ownerId)[0] : 'AUSENTE',
                  valor_ownerId: campo(x, 'ownerId'),
                  tipo_data: x.fields?.data ? Object.keys(x.fields.data)[0] : 'AUSENTE',
                  tem_atividades: !!x.fields?.atividades,
                  tem_horario: !!x.fields?.horario,
                }));
              } catch {
                return [];
              }
            })())
          : [],
      });
    }
    return new Response(
      JSON.stringify(
        {
          ...r,
          banco_usado: dbId,
          obras_no_banco: obrasDetalhadas,
          vinculos_telegram: usuarios.map((d: any) => ({
            uid: (String(d.name).split('/').pop() || '').slice(0, 10) + '...',
            chatTelegram: campo(d, 'telegramChatId') || '(sem vínculo)',
          })),
        },
        null,
        2
      ),
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (e: any) {
    r['10_raio_x_banco'] = 'FALHOU: ' + String(e?.message || e).slice(0, 180);
  }

  return new Response(JSON.stringify(r, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
