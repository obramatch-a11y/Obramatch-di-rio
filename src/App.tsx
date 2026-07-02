/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ObraDashboard from './components/ObraDashboard';
import DiarioForm from './components/DiarioForm';
import DiarioDetail from './components/DiarioDetail';
import AgentesMatchModal from './components/AgentesMatchModal';
import { motion, AnimatePresence } from 'motion/react';
import { HardHat } from 'lucide-react';

function ObraMatchDebugBanner() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[999999] bg-amber-500 text-blue-950 min-h-[48px] p-4 flex flex-col items-center justify-center gap-2 shadow-xl font-bold"
      id="obramatch-debug-banner"
    >
      <div className="text-center text-sm md:text-base tracking-wider uppercase">
        OBRAMATCH VISÍVEL - ECOSSISTEMA OBRAMATCH
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
        <a 
          href="https://obramatch.com.br/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-blue-950 hover:bg-blue-900 text-amber-400 px-4 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          ObraMatch
        </a>
        <a 
          href="https://obramatchof.blogspot.com/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-blue-950 hover:bg-blue-900 text-amber-400 px-4 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          Blog ObraMatch
        </a>
        <a 
          href="https://agentes.obramatch.com.br/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-blue-950 hover:bg-blue-900 text-amber-400 px-4 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          Agentes Match
        </a>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, currentView, showAgentesModal, closeAgentesModal, selectedAgentId } = useApp();

  return (
    <div className="pt-[110px] md:pt-[96px] min-h-screen bg-slate-950 flex flex-col">
      <ObraMatchDebugBanner />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="p-3 bg-amber-500 rounded-2xl mb-4 shadow-xl shadow-amber-500/10"
          >
            <HardHat className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </motion.div>
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase animate-pulse">
            Carregando ObraMatch...
          </p>
        </div>
      ) : !user ? (
        <Login />
      ) : (
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
