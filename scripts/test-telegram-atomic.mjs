import { build } from 'esbuild';
import assert from 'node:assert/strict';

const result = await build({ entryPoints: ['functions/_lib/firestore.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'test-google', setup(build) {
  build.onResolve({ filter: /^\.\/google$/ }, () => ({ path: 'google', namespace: 'test' }));
  build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: "export const obterAccessToken = async () => 'owner'; export const projetoEBanco = () => ({ projectId: 'demo-obramatch', dbId: '(default)' });", loader: 'js' }));
} }] });
const { fsGet, fsSet, fsCommitRdoTelegram } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => originalFetch(String(url).replace('https://firestore.googleapis.com', 'http://127.0.0.1:8188'), options);
const env = {};
await fsSet(env, 'obras/obra', { ownerId: 'alice', proximoNumeroRdo: 1 }, false);
await fsSet(env, 'rdo_pendentes/42', { uid: 'alice', obraId: 'obra', atividades: 'Obra' }, false);
const obra = await fsGet(env, 'obras/obra');
const pend = await fsGet(env, 'rdo_pendentes/42');
const input = { obraId: 'obra', diarioId: 'rdo1', chatId: 42, obraUpdateTime: obra.updateTime, pendenteUpdateTime: pend.updateTime, numeroRdo: 1, diario: { ownerId: 'alice', numeroRdo: 1 }, fotos: [{ ownerId: 'alice', url: 'photo' }] };
assert.equal(await fsCommitRdoTelegram(env, input), true);
assert.equal((await fsGet(env, 'obras/obra')).data.proximoNumeroRdo, 2);
assert.equal((await fsGet(env, 'obras/obra/diarios/rdo1')).data.numeroRdo, 1);
assert.equal((await fsGet(env, 'obras/obra/diarios/rdo1/fotos/0')).data.url, 'photo');
assert.equal(await fsGet(env, 'rdo_pendentes/42'), null);
assert.equal(await fsCommitRdoTelegram(env, { ...input, diarioId: 'duplicado' }), false);
assert.equal(await fsGet(env, 'obras/obra/diarios/duplicado'), null);
await fsSet(env, 'rdo_pendentes/43', { uid: 'alice', obraId: 'obra', atividades: 'A' }, false);
await fsSet(env, 'rdo_pendentes/44', { uid: 'alice', obraId: 'obra', atividades: 'B' }, false);
const before = await fsGet(env, 'obras/obra');
const [pendingA, pendingB] = await Promise.all([fsGet(env, 'rdo_pendentes/43'), fsGet(env, 'rdo_pendentes/44')]);
const race = await Promise.all([
  fsCommitRdoTelegram(env, { ...input, diarioId: 'rdo2a', chatId: 43, obraUpdateTime: before.updateTime, pendenteUpdateTime: pendingA.updateTime, numeroRdo: 2 }),
  fsCommitRdoTelegram(env, { ...input, diarioId: 'rdo2b', chatId: 44, obraUpdateTime: before.updateTime, pendenteUpdateTime: pendingB.updateTime, numeroRdo: 2 }),
]);
assert.equal(race.filter(Boolean).length, 1);
assert.equal((await fsGet(env, 'obras/obra')).data.proximoNumeroRdo, 3);
const telegramBuild = await build({ entryPoints: ['functions/api/telegram.ts'], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'test-mocks', setup(build) {
  build.onResolve({ filter: /(?:^\.\/google|_lib\/google)$/ }, () => ({ path: 'google', namespace: 'mock' }));
  build.onResolve({ filter: /_lib\/telegram$/ }, () => ({ path: 'telegram', namespace: 'mock' }));
  build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'google'
    ? "export const obterAccessToken = async () => 'owner'; export const projetoEBanco = () => ({ projectId: 'demo-obramatch', dbId: '(default)' });"
    : "export async function enviarMensagem(_env, _chat, message) { globalThis.testMessages.push(message); } export async function enviarAcao() {} export async function responderCallback() {} export async function removerTeclado() {} export async function baixarArquivo() {} export async function buscarClimaOficial() {} export async function uploadFotoSupabase() {}", loader: 'js' }));
} }] });
const { confirmarRdo } = await import(`data:text/javascript;base64,${Buffer.from(telegramBuild.outputFiles[0].contents).toString('base64')}`);
globalThis.testMessages = [];
await fsSet(env, 'rdo_pendentes/45', { uid: 'alice', obraId: 'obra', atividades: 'Concretagem', fotos: [{ url: 'data:image/jpeg;base64,AA==' }] }, false);
await confirmarRdo(env, 45, 'alice');
assert.equal((await fsGet(env, 'obras/obra')).data.proximoNumeroRdo, 4);
assert.equal(await fsGet(env, 'rdo_pendentes/45'), null);
assert.match(globalThis.testMessages[0], /RDO Nº 003/);
await fsSet(env, 'rdo_pendentes/46', { uid: 'bob', obraId: 'obra', atividades: 'Teste' }, false);
await assert.rejects(confirmarRdo(env, 46, 'bob'));
assert.ok(await fsGet(env, 'rdo_pendentes/46'));
console.log('Commit atômico do Telegram: OK');

