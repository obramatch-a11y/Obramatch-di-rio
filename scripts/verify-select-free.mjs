import { build } from 'esbuild';
import assert from 'node:assert/strict';

const bundle = await build({ entryPoints: ['functions/_lib/authoritativeProxy.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { proxyAuthoritativePost } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString('base64')}`);
let forwarded;
globalThis.fetch = async (url, init) => {
  forwarded = { url, ...init };
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const request = () => new Request('https://app.example/api/payments/cancel', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select_free' }) });
const response = await proxyAuthoritativePost(request(), '/api/payments/cancel');
assert.equal(response.status, 200);
assert.equal(forwarded.url, 'https://diario.obramatch.com.br/api/payments/cancel');
assert.equal(forwarded.headers.Authorization, 'Bearer test-token');
assert.deepEqual(JSON.parse(forwarded.body), { action: 'select_free' });
assert.equal((await proxyAuthoritativePost(new Request('https://app.example', { method: 'POST' }), '/api/payments/cancel')).status, 401);
assert.equal((await proxyAuthoritativePost(request(), '/api/other')).status, 404);
console.log('Proxy da escolha Free: OK');

