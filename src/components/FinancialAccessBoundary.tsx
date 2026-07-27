import React, { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CalendarClock, HardHat, LockKeyhole, LogOut, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import {
  deleteWorkAuthoritatively,
  selectFreePlanAuthoritatively,
} from '../lib/authoritativeApi';

interface Props {
  children: ReactNode;
}

function plural(value: number, singular: string, pluralText: string): string {
  return value === 1 ? singular : pluralText;
}

export default function FinancialAccessBoundary({ children }: Props) {
  const { user, financialAccess, obras } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectingFree, setSelectingFree] = useState(false);
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lockedWorks = obras.filter((obra) => obra.lockedByPlan);

  useEffect(() => {
    if (!user || !financialAccess.shouldWarn || financialAccess.isBlocked) {
      setShowModal(false);
      return;
    }
    const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Recife' });
    const key = `app-financial-notice:${user.uid}:${financialAccess.stage}:${dateKey}`;
    if (!sessionStorage.getItem(key)) setShowModal(true);
  }, [user, financialAccess.stage, financialAccess.shouldWarn, financialAccess.isBlocked]);

  const closeModal = () => {
    if (user) {
      const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Recife' });
      sessionStorage.setItem(`app-financial-notice:${user.uid}:${financialAccess.stage}:${dateKey}`, 'seen');
    }
    setShowModal(false);
  };

  const selectFree = async () => {
    if (!user || selectingFree) return;
    const confirmed = window.confirm(
      'Ao continuar no plano Free, somente as duas obras ativas mais novas permanecerão disponíveis. As demais ficarão bloqueadas e permitirão apenas exclusão. Nenhum dado será apagado automaticamente. Deseja continuar?',
    );
    if (!confirmed) return;

    setSelectingFree(true);
    setError(null);
    try {
      await selectFreePlanAuthoritatively(user);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível aplicar o plano Free.');
    } finally {
      setSelectingFree(false);
    }
  };

  const deleteLockedWork = async (obraId: string, obraNome: string) => {
    if (!user || deletingWorkId) return;
    const confirmed = window.confirm(
      `Excluir definitivamente a obra “${obraNome}”? Todos os RDOs e fotos vinculados serão apagados. Esta ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;
    const typedName = window.prompt(`Para confirmar, digite exatamente o nome da obra:\n${obraNome}`);
    if (typedName !== obraNome) {
      if (typedName !== null) window.alert('O nome informado não corresponde à obra. Exclusão cancelada.');
      return;
    }

    setDeletingWorkId(obraId);
    try {
      const result = await deleteWorkAuthoritatively(user, obraId);
      window.alert(result.completed ? 'Obra excluída definitivamente.' : 'Exclusão solicitada e em processamento.');
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Não foi possível excluir a obra.');
    } finally {
      setDeletingWorkId(null);
    }
  };

  if (!user) return <>{children}</>;

  if (financialAccess.isBlocked) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] p-4 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0_#111] p-6 sm:p-8 text-center">
          <span className="w-16 h-16 mx-auto grid place-items-center rounded-full border-2 border-black bg-red-100 text-red-700">
            <ShieldAlert className="w-9 h-9" />
          </span>
          <p className="mt-5 text-[11px] font-black tracking-[0.12em] uppercase text-neutral-500">Acesso financeiro bloqueado</p>
          <h1 className="mt-2 text-3xl font-black text-[#111]">O prazo de regularização terminou.</h1>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Seu período Pro venceu e os 5 dias para regularização foram encerrados. Renove o Plano Pro para continuar com todos os projetos ou confirme o retorno ao plano Free.
          </p>
          <div className="mt-5 p-4 text-left text-sm leading-6 bg-neutral-100 border-2 border-black rounded-xl">
            <strong>Ao escolher o Free:</strong> somente as duas obras ativas mais novas ficam disponíveis. As demais permanecem armazenadas, porém bloqueadas, permitindo apenas exclusão.
          </div>
          {error && <p className="mt-4 p-3 rounded-xl bg-red-100 text-red-800 text-sm font-bold">{error}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="nb-btn nb-btn-primary py-3 px-4 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> Já renovei — verificar novamente
            </button>
            <button
              type="button"
              disabled={selectingFree}
              onClick={selectFree}
              className="nb-btn nb-btn-ghost py-3 px-4 flex items-center justify-center gap-2"
            >
              <HardHat className="w-5 h-5" /> {selectingFree ? 'Aplicando plano Free...' : 'Continuar no plano Free'}
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="py-2 text-sm font-bold text-neutral-600 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isExpiring = financialAccess.stage === 'pro_expiring';
  const noticeTitle = isExpiring
    ? `Seu Plano Pro vence em ${financialAccess.daysUntilExpiry} ${plural(financialAccess.daysUntilExpiry, 'dia', 'dias')}.`
    : 'Seu Plano Pro venceu.';
  const noticeText = isExpiring
    ? 'Faça a renovação com antecedência para manter todos os projetos disponíveis sem interrupção.'
    : `Renove em até ${financialAccess.regularizationDaysRemaining} ${plural(financialAccess.regularizationDaysRemaining, 'dia', 'dias')} para evitar o bloqueio dos seus projetos.`;

  return (
    <>
      {financialAccess.shouldWarn && (
        <div className={`sticky top-0 z-[70] border-b-[3px] border-black px-4 py-3 ${isExpiring ? 'bg-amber-100 text-amber-950' : 'bg-red-100 text-red-950'}`}>
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 text-sm leading-5 text-center">
            {isExpiring ? <CalendarClock className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span><strong>{noticeTitle}</strong> {noticeText}</span>
          </div>
        </div>
      )}

      {children}

      {lockedWorks.length > 0 && financialAccess.stage === 'free' && (
        <section className="fixed left-3 right-3 bottom-3 z-[60] max-h-[42vh] overflow-y-auto bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0_#111] p-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 grid place-items-center rounded-xl border-2 border-black bg-neutral-100 shrink-0"><LockKeyhole className="w-5 h-5" /></span>
              <div>
                <h2 className="font-black text-[#111]">Obras bloqueadas pelo plano Free</h2>
                <p className="text-xs text-neutral-600 mt-1">Essas obras não podem ser abertas, editadas nem arquivadas. Renove o Pro para desbloqueá-las ou exclua individualmente.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {lockedWorks.map((obra) => (
                <div key={obra.id} className="border-2 border-black rounded-xl p-3 flex items-center justify-between gap-3 bg-neutral-50">
                  <div className="min-w-0"><strong className="block truncate">{obra.nome}</strong><span className="text-xs text-neutral-500">Projeto bloqueado</span></div>
                  <button
                    type="button"
                    disabled={Boolean(deletingWorkId)}
                    onClick={() => deleteLockedWork(obra.id, obra.nome)}
                    className="shrink-0 px-3 py-2 rounded-lg border-2 border-black text-red-700 bg-white font-black text-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> {deletingWorkId === obra.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 p-4 grid place-items-center"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="app-financial-title" className="relative w-full max-w-md bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0_#111] p-6 text-center">
            <button type="button" aria-label="Fechar aviso" onClick={closeModal} className="absolute top-3 right-3 p-2 rounded-lg bg-neutral-100"><X className="w-5 h-5" /></button>
            <span className={`w-16 h-16 mx-auto grid place-items-center rounded-full border-2 border-black ${isExpiring ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>
              {isExpiring ? <CalendarClock className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </span>
            <h2 id="app-financial-title" className="mt-5 text-2xl font-black text-[#111]">{noticeTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{noticeText}</p>
            {!isExpiring && <p className="mt-3 text-xs font-bold text-neutral-500">O Pro já está vencido. Este período é somente para regularização antes do bloqueio.</p>}
            <button type="button" onClick={closeModal} className="mt-6 nb-btn nb-btn-primary py-3 px-5 w-full">Entendi — vou renovar</button>
          </div>
        </div>
      )}
    </>
  );
}
