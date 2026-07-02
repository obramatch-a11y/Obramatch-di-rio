import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send, HelpCircle, ArrowRight, User, Check, Sparkles } from 'lucide-react';
import { AGENTS, MatchAgent } from '../lib/ecosystemData';

interface AgentesMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAgentId?: string | null;
}

interface Message {
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

export default function AgentesMatchModal({ isOpen, onClose, initialAgentId }: AgentesMatchModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<MatchAgent | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialAgentId) {
        const found = AGENTS.find(a => a.id === initialAgentId);
        if (found) {
          handleSelectAgent(found);
          return;
        }
      }
      setSelectedAgent(null);
      setChatMessages([]);
    }
  }, [isOpen, initialAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleSelectAgent = (agent: MatchAgent) => {
    setSelectedAgent(agent);
    setChatMessages([
      {
        sender: 'agent',
        text: agent.initialMessage,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedAgent) return;

    const userMsg = userInput;
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setUserInput('');
    setIsTyping(true);

    // Simulate Agent responses based on context
    setTimeout(() => {
      let reply = '';
      const promptLower = userMsg.toLowerCase();

      if (selectedAgent.id === 'normas') {
        if (promptLower.includes('desempenho') || promptLower.includes('15575')) {
          reply = 'A NBR 15575 estabelece critérios de desempenho para edificações habitacionais divididos em sistemas estruturais, de pisos, vedações verticais internas e externas, coberturas e hidrossanitários. O objetivo é garantir vida útil de projeto (VUP), conforto térmico, acústico, lumínico e segurança contra incêndios.';
        } else if (promptLower.includes('acessibilidade') || promptLower.includes('9050')) {
          reply = 'A NBR 9050 trata da acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos. Preste muita atenção às inclinações máximas de rampas (padrão de 8,33% até no máximo 12,5% sob certas condições), largura livre mínima de corredores (1,20m a 1,50m) e áreas de manobra de cadeiras de rodas.';
        } else {
          reply = `Com base nas normas da ABNT para a construção civil, recomendo verificar sempre a vida útil dos sistemas (VUP) e documentar o traço correto no diário de obra para garantir a conformidade técnica em laudos futuros. Qual outra dúvida normativa você tem?`;
        }
      } else if (selectedAgent.id === 'estruturas') {
        if (promptLower.includes('concreto') || promptLower.includes('viga') || promptLower.includes('pilar')) {
          reply = 'Para vigas e pilares, atente-se ao cobrimento mínimo da armadura conforme a classe de agressividade ambiental (CAA) definida na NBR 6118 (geralmente de 25mm a 40mm). Garanta que os espaçadores estejam posicionados a cada 1 metro para evitar corrosão futura.';
        } else if (promptLower.includes('fundacao') || promptLower.includes('fundação') || promptLower.includes('sapata')) {
          reply = 'As sapatas devem ser assentadas sobre solo com capacidade de carga confirmada (ensaio SPT). O cobrimento mínimo de sapatas é de 40mm a 50mm para proteção contra umidade do solo. Recomendo também aplicar impermeabilização com argamassa polimérica antes da superestrutura.';
        } else {
          reply = 'Recomendo consultar a NBR 6118 para projetos de concreto armado. Certifique-se de preencher a data de concretagem e o lote de concreto recebido nos diários para rastreabilidade de ruptura de corpos de prova (CP).';
        }
      } else if (selectedAgent.id === 'patologias') {
        if (promptLower.includes('infiltração') || promptLower.includes('umidade') || promptLower.includes('vazamento')) {
          reply = 'Umidade ascendente em baldrames é uma patologia grave. Deve-se tratar com injeção química de silicato/silicone ou remover o reboco afetado até a alvenaria, aplicar argamassa polimérica impermeabilizante e depois refazer o acabamento com aditivos hidrofugantes.';
        } else if (promptLower.includes('fissura') || promptLower.includes('trinca') || promptLower.includes('rachadura')) {
          reply = 'Trincas inclinadas em alvenaria de vedação geralmente indicam recalque diferencial de fundação ou falta de verga/contraverga em vãos de portas e janelas. É importante monitorar com selos de gesso para verificar se a trinca está ativa antes de realizar o tratamento.';
        } else {
          reply = 'Para patologias construtivas, a chave é o diagnóstico na origem (umidade, movimentação térmica, sobrecarga). Documentar com fotos nítidas no diário auxilia engenheiros a elaborarem laudos estruturais precisos.';
        }
      } else if (selectedAgent.id === 'orcamentos') {
        if (promptLower.includes('sinapi') || promptLower.includes('custo') || promptLower.includes('tabela')) {
          reply = 'Os custos de referência do SINAPI são atualizados mensalmente pela Caixa Econômica Federal e divididos por estado. Lembre-se de somar a taxa de BDI (Benefícios e Despesas Indiretas) adequada ao tipo de obra, variando normalmente de 20% a 28%.';
        } else {
          reply = 'Para um controle de custos assertivo, mantenha o registro diário de consumo de materiais e horas de equipe. Isso permite calcular a produtividade real contra o orçado na planilha mestre.';
        }
      } else {
        reply = `Entendi a sua dúvida técnica. No ecossistema ObraMatch, nós acompanhamos o progresso executivo e recomendamos soluções para evitar retrabalhos na sua construção. Como posso te auxiliar em outro ponto?`;
      }

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: reply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const handleQuickQuestion = (question: string) => {
    setUserInput(question);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row"
      >
        {/* Sidebar: Agents List */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/40 flex flex-col h-1/3 md:h-full shrink-0">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white font-sans tracking-tight flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              Agentes Match
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {AGENTS.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/30 text-white'
                      : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-2 rounded-xl border shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500 group-hover:text-slate-300'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4 className="text-xs font-bold truncate">{agent.name}</h4>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{agent.specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
            <a
              href="https://agentes.obramatch.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              Acessar Agentes Match
            </a>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-2/3 md:h-full bg-slate-900">
          {/* Top Panel */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            {selectedAgent ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{selectedAgent.name}</h3>
                  <p className="text-[10px] text-slate-500">{selectedAgent.specialty}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-950/40 rounded-xl text-slate-500">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-400">Selecione um Agente Especialista</h3>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer hidden md:block"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages or Welcome Intro */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {selectedAgent ? (
              <>
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 h-max border ${
                        msg.sender === 'user'
                          ? 'bg-slate-950 border-slate-800 text-slate-300'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div className={`p-4 rounded-2xl shadow-lg border ${
                        msg.sender === 'user'
                          ? 'bg-slate-850/80 border-slate-800 text-slate-200 rounded-tr-none'
                          : 'bg-slate-950/60 border-slate-900 text-slate-200 rounded-tl-none'
                      }`}>
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[9px] text-slate-600 block text-right mt-1.5 font-semibold font-mono">{msg.time}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                    <div className="p-2 rounded-xl shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 mb-6">
                  <Bot className="w-8 h-8 text-slate-950 stroke-[2]" />
                </div>
                <h3 className="text-lg font-black text-white">Suporte Técnico Especializado AI</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Precisa de suporte com normas, engenharia, patologias ou orçamentos? Selecione um dos Agentes Match à esquerda para abrir o chat técnico.
                </p>

                <a
                  href="https://agentes.obramatch.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Acessar Portal de Agentes Oficial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                <div className="grid grid-cols-2 gap-2 mt-6 w-full text-left">
                  {AGENTS.slice(0, 4).map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      className="p-3 bg-slate-950/40 hover:bg-slate-950 hover:border-slate-800 border border-slate-900 rounded-xl transition-all text-xs text-slate-300 font-semibold flex items-center justify-between cursor-pointer group"
                    >
                      <span className="truncate">{agent.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions (Visible when agent selected) */}
          {selectedAgent && (
            <div className="px-4 py-2 border-t border-slate-850 bg-slate-950/10 overflow-x-auto whitespace-nowrap gap-2 flex items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-600" /> Perguntas Rápidas:
              </span>
              {selectedAgent.id === 'normas' && (
                <>
                  <button onClick={() => handleQuickQuestion('O que diz a NBR 15575 sobre vida útil?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">NBR 15575 Vida Útil</button>
                  <button onClick={() => handleQuickQuestion('Qual é a rampa máxima na NBR 9050?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">NBR 9050 Rampas</button>
                </>
              )}
              {selectedAgent.id === 'estruturas' && (
                <>
                  <button onClick={() => handleQuickQuestion('Qual é o cobrimento de concreto para lajes?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">Cobrimento de Lajes</button>
                  <button onClick={() => handleQuickQuestion('Quantos dias para desforma de pilares?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">Desforma de Pilares</button>
                </>
              )}
              {selectedAgent.id === 'patologias' && (
                <>
                  <button onClick={() => handleQuickQuestion('Como tratar umidade ascendente no baldrame?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">Umidade no Baldrame</button>
                  <button onClick={() => handleQuickQuestion('O que causa fissura a 45 graus na parede?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">Trincas 45 Graus</button>
                </>
              )}
              {selectedAgent.id === 'orcamentos' && (
                <>
                  <button onClick={() => handleQuickQuestion('Como calcular taxa de BDI na planilha?')} className="text-[10px] px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all font-semibold cursor-pointer">Calcular Taxa BDI</button>
                </>
              )}
            </div>
          )}

          {/* Form Input */}
          {selectedAgent && (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-slate-950/20 flex gap-2 items-center shrink-0">
              <input
                type="text"
                disabled={isTyping}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={`Pergunte ao especialista ${selectedAgent.name}...`}
                className="flex-1 bg-slate-950/60 border border-slate-800 focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-600 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isTyping}
                className="p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 shrink-0"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
