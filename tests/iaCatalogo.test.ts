/**
 * IA do Worker lendo o catálogo comercial: limites por plano, promoção, plano atribuído (planoId) e análise gerencial.
 * Firestore, Google OAuth, Identity Toolkit e Groq simulados em memória (sem rede, sem credenciais reais).
 * Rodar: npm run test:ia-catalogo
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const env: any = {
  GEMINI_API_KEY: 'g', GROQ_API_KEY: 'groq-test', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_SECRET: 's',
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: 'proj', client_email: 'svc@t.iam.gserviceaccount.com', private_key: privateKey }),
  FIREBASE_DB_ID: 'db', FIREBASE_WEB_API_KEY: 'web-key',
};
const BASE = 'https://firestore.googleapis.com/v1/projects/proj/databases/db/documents/';
type Doc = Record<string, any>;
const docs = new Map<string, Doc>();
const tokens: Record<string, string> = { 'tok-free': 'u-free', 'tok-pro': 'u-pro', 'tok-equipe': 'u-equipe', 'tok-empresa': 'u-empresa' };
let failPlanDocs = false;
let groqCalls: any[] = [];
const writes: Array<[string, Doc]> = [];

const S = (v: string) => ({ stringValue: v });
const I = (v: number) => ({ integerValue: String(v) });
const B = (v: boolean) => ({ booleanValue: v });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = String(input);
  if (href.startsWith('https://oauth2.googleapis.com/token')) return json(200, { access_token: 'tk', expires_in: 3600 });
  if (href.startsWith('https://identitytoolkit.googleapis.com/')) {
    const { idToken } = JSON.parse(String(init?.body));
    return tokens[idToken] ? json(200, { users: [{ localId: tokens[idToken] }] }) : json(400, {});
  }
  if (href.startsWith('https://api.groq.com/openai/v1/chat/completions')) {
    groqCalls.push(JSON.parse(String(init?.body)));
    return json(200, { choices: [{ message: { content: 'Resumo executivo\nTexto de teste.' } }] });
  }
  if (href.startsWith(BASE)) {
    const path = decodeURIComponent(href.slice(BASE.length).split('?')[0]);
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      writes.push([path, body.fields]);
      docs.set(path, { ...(docs.get(path) || {}), ...body.fields });
      return json(200, { name: `x/${path}`, fields: docs.get(path) });
    }
    if (failPlanDocs && path.startsWith('config_comercial_planos/')) return json(500, { error: 'boom' });
    const doc = docs.get(path);
    return doc ? json(200, { name: `${BASE}${path}`, fields: doc, updateTime: '2026-01-01T00:00:00Z' }) : json(404, {});
  }
  throw new Error(`Chamada inesperada: ${href}`);
}) as typeof fetch;

const { onRequestPost } = await import('../functions/api/ia.ts');
const { limparCacheCatalogo } = await import('../functions/_lib/catalogoPlanos.ts');

const dia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Recife' });
const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const seed = () => {
  docs.clear(); writes.length = 0; groqCalls = []; failPlanDocs = false; limparCacheCatalogo();
  docs.set('planos/u-pro', { plano: S('pro'), validade: S(future) });
  docs.set('planos/u-equipe', { plano: S('pro'), validade: S(future), planoId: S('equipe') });
  docs.set('planos/u-empresa', { plano: S('pro'), validade: S(future), planoId: S('empresa') });
};
const ia = async (token: string, body: unknown) => {
  const res = await onRequestPost({ env, request: new Request('https://x/api/ia', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json() as any };
};
const resumo = { periodoDias: 90, totais: { obras: 1, rdos: 12 }, insights: [{ titulo: 'Obra A: 20 dias sem RDO' }] };
let passed = 0;
const test = async (name: string, run: () => Promise<void>) => { seed(); await run(); passed += 1; console.log(`  ok  ${name}`); };

await test('sem catálogo: Free segue 2 melhorias/dia e Pro 60/dia (comportamento atual)', async () => {
  docs.set('uso_ia/u-free_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(2), melhoriaMes: I(2) });
  const r = await ia('tok-free', { tipo: 'melhorar', texto: 'teste' });
  assert.equal(r.status, 429);
  const ok = await ia('tok-pro', { tipo: 'melhorar', texto: 'teste' });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

await test('admin altera limite do Free no catálogo: o Worker passa a respeitar', async () => {
  docs.set('config_comercial_planos/free', { status: S('active'), melhoriaDia: I(5), melhoriaMes: I(50) });
  docs.set('uso_ia/u-free_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(3), melhoriaMes: I(3) });
  const r = await ia('tok-free', { tipo: 'melhorar', texto: 'teste' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

await test('plano atribuído (equipe) usa os limites do plano equipe; -1 = sem limite', async () => {
  docs.set('config_comercial_planos/equipe', { status: S('draft'), melhoriaDia: I(-1), melhoriaMes: I(-1) });
  docs.set('uso_ia/u-equipe_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(500), melhoriaMes: I(5000) });
  const r = await ia('tok-equipe', { tipo: 'melhorar', texto: 'teste' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  docs.set('uso_ia/u-pro_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(500), melhoriaMes: I(5000) });
  assert.equal((await ia('tok-pro', { tipo: 'melhorar', texto: 'teste' })).status, 429, 'Pro continua limitado');
});

await test('plano arquivado ou desconhecido segue as regras do Pro', async () => {
  docs.set('config_comercial_planos/equipe', { status: S('archived'), melhoriaDia: I(1000), melhoriaMes: I(1000) });
  docs.set('uso_ia/u-equipe_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(60), melhoriaMes: I(60) });
  assert.equal((await ia('tok-equipe', { tipo: 'melhorar', texto: 'teste' })).status, 429);
});

await test('promoção ativa: Free passa a ter limites do Pro; ilegível = desligada', async () => {
  docs.set('uso_ia/u-free_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(10), melhoriaMes: I(10) });
  assert.equal((await ia('tok-free', { tipo: 'melhorar', texto: 'x' })).status, 429);
  docs.set('config_comercial/launch_promo', { active: B(true) });
  limparCacheCatalogo();
  assert.equal((await ia('tok-free', { tipo: 'melhorar', texto: 'x' })).status, 200);
  docs.set('config_comercial/launch_promo', { active: B(false) });
  limparCacheCatalogo();
  assert.equal((await ia('tok-free', { tipo: 'melhorar', texto: 'x' })).status, 429);
});

await test('falha ao ler o catálogo de planos: usa padrões do código (não libera mais)', async () => {
  docs.set('config_comercial_planos/free', { status: S('active'), melhoriaDia: I(100), melhoriaMes: I(100) });
  docs.set('uso_ia/u-free_' + dia.slice(0, 7), { dia: S(dia), melhoriaDia: I(2), melhoriaMes: I(2) });
  failPlanDocs = true; limparCacheCatalogo();
  assert.equal((await ia('tok-free', { tipo: 'melhorar', texto: 'x' })).status, 429);
});

await test('análise gerencial: Free é barrado (403) sem chamar a IA e sem consumir franquia', async () => {
  const r = await ia('tok-free', { tipo: 'analise_gerencial', resumo });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(groqCalls.length, 0);
  assert.equal(writes.length, 0);
});

await test('análise gerencial: Empresa recebe o texto, o prompt exige só dados fornecidos, e consome 1 melhoria', async () => {
  const r = await ia('tok-empresa', { tipo: 'analise_gerencial', resumo });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.match(r.body.texto, /Resumo executivo/);
  assert.equal(groqCalls.length, 1);
  const system = groqCalls[0].messages[0].content as string;
  assert.match(system, /LER cada RDO/);
  assert.match(system, /Todo FATO deve vir dos RDOs/);
  assert.equal((groqCalls[0] as any).max_tokens, 4096);
  assert.match(system, /hipótese/);
  assert.match(groqCalls[0].messages[1].content, /Obra A: 20 dias sem RDO/);
  const uso = writes.find(([p]) => p.startsWith('uso_ia/u-empresa_'))!;
  assert.equal(Number((uso[1].melhoriaDia as any).integerValue), 1);
});

await test('análise gerencial: recurso desligado no catálogo vem só no Empresa; admin liga/desliga por plano', async () => {
  assert.equal((await ia('tok-pro', { tipo: 'analise_gerencial', resumo })).status, 403, 'Pro não tem por padrão');
  docs.set('config_comercial_planos/empresa', { status: S('active'), features: { mapValue: { fields: { relatoriosGerenciais: B(false) } } } });
  assert.equal((await ia('tok-empresa', { tipo: 'analise_gerencial', resumo })).status, 403);
  docs.set('config_comercial_planos/pro', { status: S('active'), features: { mapValue: { fields: { relatoriosGerenciais: B(true) } } } });
  limparCacheCatalogo();
  assert.equal((await ia('tok-pro', { tipo: 'analise_gerencial', resumo })).status, 200);
  docs.set('config_comercial_planos/free', { status: S('active'), features: { mapValue: { fields: { relatoriosGerenciais: B(true) } } } });
  limparCacheCatalogo();
  assert.equal((await ia('tok-free', { tipo: 'analise_gerencial', resumo })).status, 200);
});

await test('análise gerencial: valida resumo (objeto) e tamanho máximo', async () => {
  assert.equal((await ia('tok-empresa', { tipo: 'analise_gerencial' })).status, 400);
  assert.equal((await ia('tok-empresa', { tipo: 'analise_gerencial', resumo: 'texto' })).status, 400);
  assert.equal((await ia('tok-empresa', { tipo: 'analise_gerencial', resumo: { x: 'a'.repeat(71_000) } })).status, 413);
  assert.equal(groqCalls.length, 0);
});

await test('tipo inválido continua 400 e sem sessão continua 401', async () => {
  assert.equal((await ia('tok-pro', { tipo: 'outro' })).status, 400);
  assert.equal((await ia('token-ruim', { tipo: 'melhorar', texto: 'x' })).status, 401);
});

console.log(`\n${passed} testes de IA com catálogo aprovados.`);
