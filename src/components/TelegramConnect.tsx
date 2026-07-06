import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';

const BOT_USERNAME = 'diariomatchbot';

// Vínculo da conta com o bot do Telegram: gera um código temporário,
// grava em usuarios/{uid} e abre o bot com /start CODIGO.
export default function TelegramConnect() {
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const verificar = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        setConectado(Boolean(snap.data()?.telegramChatId));
      } catch {
        setConectado(false);
      }
    };
    verificar();
  }, []);

  const conectar = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setGerando(true);
    try {
      const codigo = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32])
        .join('');
      await setDoc(
        doc(db, 'usuarios', user.uid),
        {
          telegramLinkCode: codigo,
          telegramLinkExpira: Date.now() + 10 * 60 * 1000,
          email: user.email || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      window.open(`https://t.me/${BOT_USERNAME}?start=${codigo}`, '_blank');
    } catch (err) {
      console.error('Erro ao gerar código de vínculo:', err);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex items-center gap-3">
      <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl shrink-0">
        <Send className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white">Diário pelo Telegram</h4>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          {conectado
            ? 'Conta conectada. Mande um áudio no bot e o RDO é gerado sozinho.'
            : 'Mande um áudio no Telegram e a IA registra o RDO por você.'}
        </p>
      </div>
      {conectado ? (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Conectado
        </span>
      ) : (
        <button
          onClick={conectar}
          disabled={gerando || conectado === null}
          className="py-2.5 px-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all text-xs shrink-0"
        >
          {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Conectar
        </button>
      )}
    </div>
  );
}
