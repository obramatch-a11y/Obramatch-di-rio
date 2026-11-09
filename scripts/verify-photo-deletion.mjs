import { build } from 'esbuild';
import assert from 'node:assert/strict';

const result = await build({ entryPoints: ['worker/authoritativeActions.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { removerArquivoFoto } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_KEY: 'test-key' };
const prefix = `${env.SUPABASE_URL}/storage/v1/object/public/diario-fotos/`;
let request;
globalThis.fetch = async (url, init) => { request = { url, init }; return new Response('', { status: 200 }); };
await removerArquivoFoto(env, { url: 'data:image/jpeg;base64,abc' }, 'work', 'diary');
assert.equal(request, undefined);
await removerArquivoFoto(env, { url: `${prefix}work/diary/photo.jpg` }, 'work', 'diary');
assert.equal(request.url, `${env.SUPABASE_URL}/storage/v1/object/diario-fotos`);
assert.deepEqual(JSON.parse(request.init.body), { prefixes: ['work/diary/photo.jpg'] });
await assert.rejects(removerArquivoFoto(env, { url: `${prefix}other/diary/photo.jpg` }, 'work', 'diary'));
await assert.rejects(removerArquivoFoto(env, { url: 'https://evil.example/photo.jpg' }, 'work', 'diary'));
await assert.rejects(removerArquivoFoto({}, { url: `${prefix}work/diary/photo.jpg` }, 'work', 'diary'));
globalThis.fetch = async () => new Response('', { status: 500 });
await assert.rejects(removerArquivoFoto(env, { url: `${prefix}work/diary/photo.jpg` }, 'work', 'diary'));
console.log('Exclusão segura de arquivos legados: OK');

