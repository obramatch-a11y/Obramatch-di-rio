import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appContext = read('src/context/AppContext.tsx');
const clientApi = read('src/lib/authoritativeApi.ts');
const proxy = read('functions/_lib/authoritativeProxy.ts');
const archiveRoute = read('functions/api/obras/archive.ts');
const reactivateRoute = read('functions/api/obras/reactivate.ts');
const deletePhotoRoute = read('functions/api/storage/delete-photo.ts');
const deleteDiaryRoute = read('functions/api/diarios/delete.ts');
const assetLinks = read('public/.well-known/assetlinks.json');
const viteConfig = read('vite.config.ts');

assert(!appContext.includes('deleteDoc('), 'AppContext não pode excluir documentos diretamente do Firestore');
assert(!appContext.includes('getDocs('), 'fluxos destrutivos não podem enumerar documentos no cliente');
assert(appContext.includes('setWorkArchived'), 'arquivamento deve usar a API autoritativa');
assert(appContext.includes('deleteDiaryAuthoritatively'), 'RDO deve usar a API autoritativa');
assert(appContext.includes('deletePhotoAuthoritatively'), 'foto deve usar a API autoritativa');
assert(appContext.includes('temporariamente bloqueada'), 'exclusão total deve permanecer bloqueada até homologação do pipeline em lote');
assert(appContext.includes('delete safeData.arquivada'), 'updateObra não pode alterar arquivada diretamente');
assert(clientApi.includes('user.getIdToken(true)'), 'cliente deve renovar token após 401');
assert(clientApi.includes('if (!navigator.onLine)'), 'ações destrutivas devem ser bloqueadas offline');
assert(proxy.includes("const AUTHORITATIVE_ORIGIN = 'https://diario.obramatch.com.br'"), 'proxy deve apontar para a API homologada');
assert(proxy.includes('ALLOWED_PATHS'), 'proxy deve usar allowlist fixa de rotas');
assert(!proxy.includes('request.headers.entries()'), 'proxy não pode encaminhar cabeçalhos arbitrários');
assert(archiveRoute.includes("'/api/obras/archive'"), 'rota de arquivamento incorreta');
assert(reactivateRoute.includes("'/api/obras/reactivate'"), 'rota de reativação incorreta');
assert(deletePhotoRoute.includes("'/api/storage/delete-photo'"), 'rota de foto incorreta');
assert(deleteDiaryRoute.includes("'/api/diarios/delete'"), 'rota de RDO incorreta');

const assetLinksJson = JSON.parse(assetLinks);
assert(Array.isArray(assetLinksJson) && assetLinksJson.length > 0, 'assetlinks deve continuar válido');
assert(assetLinksJson[0]?.target?.package_name === 'com.obramatch.diario', 'package name do TWA não pode mudar');
assert(assetLinksJson[0]?.target?.sha256_cert_fingerprints?.length === 2, 'fingerprints do Google Play devem ser preservados');
assert(viteConfig.includes("manifestFilename: 'manifest.json'"), 'nome do manifesto deve permanecer estável');
assert(viteConfig.includes("start_url: '/'"), 'start_url do TWA deve permanecer estável');
assert(viteConfig.includes("scope: '/'"), 'scope do TWA deve permanecer estável');

console.log('Fluxos autoritativos do TWA: OK');
