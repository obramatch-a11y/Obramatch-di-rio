/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
const Dashboard = lazy(() => import('./components/Dashboard'));
const ObraDashboard = lazy(() => import('./components/ObraDashboard'));
const DiarioForm = lazy(() => import('./components/DiarioForm'));
const DiarioDetail = lazy(() => import('./components/DiarioDetail'));
const ExportarRdos = lazy(() => import('./components/ExportarRdos'));
const AgentesMatchModal = lazy(() => import('./components/AgentesMatchModal'));
import { motion, AnimatePresence } from 'motion/react';
import { HardHat, LockKeyhole } from 'lucide-react';
import { selectFreePlan } from './lib/authoritativeApi';

function AppContent() {
  const [selectingFree, setSelectingFree] = useState(false);
  const [freeError, setFreeError] = useState('');
  const [freeMessage, setFreeMessage] = useState('');
  const {
    user,
    loading,
    currentView,
    showAgentesModal,
    closeAgentesModal,
    selectedAgentId,
    financialAccess,
    planStatus,
    selectedObra,
    setView,
  } = useApp();

  const returnToFree = async () => {
    if (!user || selectingFree) return;
    if (!window.confirm('No plano Free, as duas obras ativas mais recentes permanecem disponíveis. As demais ficam bloqueadas; nenhum dado é apagado automaticamente. Deseja continuar?')) return;
    setSelectingFree(true);
    setFreeError('');
    setFreeMessage('');
    try {
      await selectFreePlan(user);
      setFreeMessage('Plano Free confirmado. Aguardando atualização da conta; se necessário, reabra o aplicativo.');
    } catch (error) {
      setFreeError(error instanceof Error ? error.message : 'Não foi possível retornar ao plano Free.');
    } finally {
      setSelectingFree(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col">
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="p-3 bg-[#FF6F00] rounded-xl mb-4"
          >
            <HardHat className="w-8 h-8 text-white stroke-[2.5]" />
          </motion.div>
          <p className="text-neutral-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
            Carregando ObraMatch Diário...
          </p>
        </div>
      ) : !user ? (
        <Login />
      ) : planStatus !== 'ready' ? (
        <main className="flex-1 flex items-center justify-center p-6" role="status">
          <section className="nb-card w-full max-w-lg p-7 text-center">
            <h1 className="font-bold text-xl">{planStatus === 'loading' ? 'Verificando sua conta...' : 'Não foi possível verificar sua conta'}</h1>
            {planStatus === 'error' && <><p className="mt-3">Confira a conexão e tente novamente.</p><button className="mt-4 rounded-lg bg-black px-5 py-3 text-white" onClick={() => window.location.reload()}>Tentar novamente</button></>}
          </section>
        </main>
      ) : financialAccess.isBlocked ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <section className="nb-card w-full max-w-lg p-7 text-center bg-red-50">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border-2 border-red-800 bg-red-100 text-red-800">
              <LockKeyhole className="h-8 w-8" />
            </span>
            <h1 className="font-display text-2xl font-black text-[#111]">Prazo de regularização encerrado</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              O Plano Pro venceu e o período de cinco dias para regularização terminou. Os dados continuam preservados, mas o uso do aplicativo está bloqueado até a renovação ou a escolha do plano Free.
            </p>
            <p className="mt-4 text-xs font-semibold text-red-800">
              No Free, até duas obras ativas ficam disponíveis. As demais permanecem preservadas e bloqueadas.
            </p>
            {freeError && <p role="alert" className="mt-4 text-sm text-red-800">{freeError}</p>}
            {freeMessage && <p role="status" className="mt-4 text-sm">{freeMessage}</p>}
            <button type="button" onClick={returnToFree} disabled={selectingFree} className="mt-5 rounded-lg bg-[#111] px-5 py-3 font-bold text-white disabled:opacity-50">
              {selectingFree ? 'Aplicando plano Free...' : 'Continuar no plano Free'}
            </button>
          </section>
        </main>
      ) : selectedObra && (selectedObra.lockedByPlan || selectedObra.lockedByAdmin) ? (
        <main className="flex-1 flex items-center justify-center p-6"><section className="nb-card w-full max-w-lg p-7 text-center">
          <h1 className="font-bold text-xl">Esta obra está bloqueada</h1>
          <p className="mt-3">Os dados permanecem preservados. Verifique o plano da conta ou entre em contato com o suporte.</p>
          <button className="mt-4 rounded-lg bg-black px-5 py-3 text-white" onClick={() => setView('dashboard')}>Voltar às obras</button>
        </section></main>
      ) : (
        <Suspense fallback={<div className="flex-1" />}>
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
              >
                {currentView === 'dashboard' && <Dashboard />}
                {currentView === 'obra-dashboard' && <ObraDashboard />}
                {currentView === 'diario-form' && <DiarioForm />}
                {currentView === 'diario-detail' && <DiarioDetail />}
                {currentView === 'exportar-rdos' && <ExportarRdos />}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {showAgentesModal && (
                <AgentesMatchModal
                  isOpen={showAgentesModal}
                  onClose={closeAgentesModal}
                  initialAgentId={selectedAgentId}
                />
              )}
            </AnimatePresence>
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

