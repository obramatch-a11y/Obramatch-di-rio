Quando o PWABuilder gerar o pacote Android, ele fornecerá o package name
(ex.: br.com.obramatch.diario) e o SHA-256 fingerprint da assinatura.
Nesse momento, renomeie assetlinks.json.example para assetlinks.json,
preencha os dois valores e faça novo deploy.
O arquivo precisará ficar acessível em:
https://diariomatch.obramatch.workers.dev/.well-known/assetlinks.json
NÃO publique assetlinks.json com valores falsos.

PENDÊNCIA PÓS-PUBLICAÇÃO NA PLAY STORE: Adicionar o SHA-256 do Play App Signing como segundo item no array sha256_cert_fingerprints em assetlinks.json.
