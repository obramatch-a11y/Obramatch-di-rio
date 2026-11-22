// Reduz uma foto para JPEG leve (a Central aceita até 150 KB por foto).
const LIMITE_CARACTERES = 195_000;

export function comprimirFoto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler a foto. Selecione-a novamente.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível abrir a foto. Selecione-a novamente.'));
      img.onload = () => {
        let lado = 800;
        for (let tentativa = 0; tentativa < 4; tentativa++) {
          const escala = Math.min(1, lado / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Não foi possível preparar a foto.')); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let qualidade = 0.7;
          let url = canvas.toDataURL('image/jpeg', qualidade);
          while (url.length > LIMITE_CARACTERES && qualidade > 0.3) {
            qualidade -= 0.1;
            url = canvas.toDataURL('image/jpeg', qualidade);
          }
          if (url.length <= LIMITE_CARACTERES) { resolve(url); return; }
          lado = Math.round(lado * 0.75);
        }
        reject(new Error('A foto ficou grande demais. Escolha uma imagem menor.'));
      };
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });
}
