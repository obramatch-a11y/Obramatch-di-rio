import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';

async function createZip() {
  const zipPath = path.join(process.cwd(), 'obramatch-diario-deploy.zip');
  const distPath = path.join(process.cwd(), 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('Erro: A pasta "dist" não existe. Por favor, execute o build antes de rodar o zip.');
    process.exit(1);
  }

  console.log('Iniciando criação do arquivo ZIP...');
  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({
    zlib: { level: 9 }
  });

  output.on('close', function() {
    console.log(`\n======================================================`);
    console.log(`Sucesso: ZIP criado com sucesso em: ${zipPath}`);
    console.log(`Tamanho total: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`======================================================\n`);
  });

  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Aviso do Archiver:', err);
    } else {
      throw err;
    }
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  // Adiciona o conteúdo da pasta dist diretamente na raiz do ZIP
  archive.directory('dist/', false);

  await archive.finalize();
}

createZip().catch((err) => {
  console.error('Erro ao gerar o ZIP:', err);
  process.exit(1);
});
