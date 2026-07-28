/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
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

function AppContent() {
  const {
    user,
    loading,
    currentView,
    showAgentesModal,
    closeAgentesModal,
    selectedAgentId,
    financialAccess,
  } = useApp();

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
              Faça a regularização pelo acesso web da sua conta ou solicite o ajuste ao suporte.
            </p>
          </section>
        </main>
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
