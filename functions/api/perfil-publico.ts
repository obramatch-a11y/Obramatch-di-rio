// GET /api/perfil-publico?uid=UID
// Ponte com o marketplace: expõe o resumo público de documentação do
// profissional para o site obramatch.com.br consumir (selo "Profissional
// que documenta"). Retorna apenas números agregados — nenhum dado sensível,
// nenhum conteúdo de RDO.

import { Env } from '../_lib/google';
import { fsQuery } from '../_lib/firestore';

export const onRequestGet = async (ctx: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const uid = url.searchParams.get('uid') || '';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // consumido pelo site ObraMatch
    'Cache-Control': 'public, max-age=3600',
  };

  if (!uid || uid.length > 128) {
    return new Response(JSON.stringify({ erro: 'Parâmetro uid obrigatório.' }), { status: 400, headers });
  }

  try {
    const obras = await fsQuery(env, 'obras', 'ownerId', uid, 100);

    // Total de RDOs = soma dos contadores sequenciais (sem varrer subcoleções)
    const totalRdos = obras.reduce((soma, o) => {
      const proximo = Number(o.data.proximoNumeroRdo) || 1;
      return soma + Math.max(proximo - 1, 0);
    }, 0);

    const datas = obras
      .map((o) => String(o.data.dataInicio || ''))
      .filter(Boolean)
      .sort();

    return new Response(
      JSON.stringify({
        totalObras: obras.length,
        totalRdos,
        desde: datas[0] || null,
        seloDocumenta: obras.length > 0 && totalRdos > 0,
      }),
      { headers }
    );
  } catch (err: any) {
    console.error('Erro no perfil público:', err?.message || err);
    return new Response(JSON.stringify({ erro: 'Indisponível no momento.' }), { status: 502, headers });
  }
};
