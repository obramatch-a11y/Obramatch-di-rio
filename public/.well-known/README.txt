Quando o PWABuilder gerar o pacote Android, ele fornecerá o package name
(ex.: br.com.obramatch.diario) e o SHA-256 fingerprint da assinatura.
Nesse momento, renomeie assetlinks.json.example para assetlinks.json,
preencha os dois valores e faça novo deploy.
O arquivo precisará ficar acessível em:
https://diario.obramatch.com.br/.well-known/assetlinks.json
NÃO publique assetlinks.json com valores falsos.
