import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../firebase';
import { Obra, Diario, Foto, OperationType, PlanoInfo, UsoIaInfo, LIMITES_PLANO } from '../types';
import { uploadFoto } from '../lib/storage';
import { calcularHashRdo } from '../lib/hash';
import {
  deleteDiaryAuthoritatively,
  deletePhotoAuthoritatively,
  setWorkArchived,
} from '../lib/authoritativeApi';
import {
  resolveFinancialAccess,
  type FinancialAccessInput,
  type FinancialAccessState,
} from '../lib/financialAccess';

interface AppContextType {
  user: User | null;
  loading: boolean;
  carregandoObras: boolean;
  obras: Obra[];
  diarios: Diario[];
  fotos: Foto[];
  online: boolean;
  currentView: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos';
  selectedObra: Obra | null;
  selectedDiario: Diario | null;
  editingDiario: Diario | null;
  showAgentesModal: boolean;
  selectedAgentId: string | null;
  openAgentesModal: (agentId?: string | null) => void;
  closeAgentesModal: () => void;
  setView: (view: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos', obra?: Obra | null, diario?: Diario | null) => void;
  createObra: (obra: Omit<Obra, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateObra: (id: string, obra: Partial<Obra>) => Promise<void>;
  deleteObra: (id: string) => Promise<void>;
  createDiario: (diario: Omit<Diario, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>, base64Photos: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]) => Promise<string>;
  updateDiario: (id: string, diario: Partial<Diario>, base64Photos?: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]) => Promise<void>;
  deleteDiario: (id: string) => Promise<void>;
  deleteFoto: (diarioId: string, fotoId: string) => Promise<void>;
  plano: PlanoInfo;
  financialAccess: FinancialAccessState;
  usoIa: UsoIaInfo;
  arquivarObra: (id: string, arquivar: boolean) => Promise<void>;
  limiteObrasAtingido: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const INITIAL_FINANCIAL_ACCESS = resolveFinancialAccess(null);

function valueToMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    const candidate = value as { seconds?: unknown; toDate?: () => Date };
    if (typeof candidate.seconds === 'number') return candidate.seconds * 1000;
    if (typeof candidate.toDate === 'function') {
      try {
        return candidate.toDate().getTime();
      } catch {
        return 0;
      }
    }
  }
  return 0;
}

function showActionError(error: unknown, fallback: string): never {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error(fallback, error);
  if (typeof window !== 'undefined') window.alert(message);
  throw new Error(message);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<Obra[]>([]);
  const [carregandoObras, setCarregandoObras] = useState(true);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [plano, setPlano] = useState<PlanoInfo>({
    plano: 'free',
    rawPlan: 'free',
    validade: null,
    stage: 'free',
    accessStatus: null,
    financialStatus: null,
    regularizationDaysRemaining: 0,
    isBlocked: false,
  });
  const [planSource, setPlanSource] = useState<FinancialAccessInput | null>(null);
  const [financialAccess, setFinancialAccess] = useState<FinancialAccessState>(INITIAL_FINANCIAL_ACCESS);
  const [usoIa, setUsoIa] = useState<UsoIaInfo>({ transcMes: 0, melhoriaMes: 0, transcDia: 0, melhoriaDia: 0 });

  // Navigation and State
  const [currentView, setCurrentView] = useState<'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos'>('dashboard');
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [selectedDiario, setSelectedDiario] = useState<Diario | null>(null);
  const [editingDiario, setEditingDiario] = useState<Diario | null>(null);
  const [showAgentesModal, setShowAgentesModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const openAgentesModal = (agentId: string | null = null) => {
    setSelectedAgentId(agentId);
    setShowAgentesModal(true);
  };

  const closeAgentesModal = () => {
    setShowAgentesModal(false);
    setSelectedAgentId(null);
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setObras([]);
        setCarregandoObras(true);
        setDiarios([]);
        setFotos([]);
        setCurrentView('dashboard');
        setSelectedObra(null);
        setSelectedDiario(null);
        setEditingDiario(null);
      }
    });
    return unsubscribe;
  }, []);

  // Handle browser back button (Android back gesture + browser back button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;

      if (!state || !state.appView) {
        setCurrentView('dashboard');
        setSelectedObra(null);
        setSelectedDiario(null);
        setEditingDiario(null);
        return;
      }

      const targetView = state.appView as 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos';
      setCurrentView(targetView);

      if (state.obraId) {
        const foundObra = obras.find((obra) => obra.id === state.obraId);
        setSelectedObra(foundObra || null);
      } else {
        setSelectedObra(null);
      }

      if (state.diarioId) {
        const foundDiario = diarios.find((diario) => diario.id === state.diarioId);
        setSelectedDiario(foundDiario || null);
        setEditingDiario(foundDiario || null);
      } else {
        setSelectedDiario(null);
        setEditingDiario(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [obras, diarios]);

  // Plano e consumo de IA (documentos escritos só pelo servidor; aqui só leitura)
  useEffect(() => {
    if (!user) {
      setPlanSource(null);
      setPlano({
        plano: 'free',
        rawPlan: 'free',
        validade: null,
        stage: 'free',
        accessStatus: null,
        financialStatus: null,
        regularizationDaysRemaining: 0,
        isBlocked: false,
      });
      setFinancialAccess(INITIAL_FINANCIAL_ACCESS);
      setUsoIa({ transcMes: 0, melhoriaMes: 0, transcDia: 0, melhoriaDia: 0 });
      return;
    }

    const unsubPlano = onSnapshot(doc(db, 'planos', user.uid), (snap) => {
      setPlanSource((snap.data() || null) as FinancialAccessInput | null);
    }, () => setPlanSource(null));

    const mes = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Recife' }).slice(0, 7);
    const unsubUso = onSnapshot(doc(db, 'uso_ia', `${user.uid}_${mes}`), (snap) => {
      const data = snap.data() || {};
      const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Recife' });
      setUsoIa({
        transcMes: Number(data.transcMes) || 0,
        melhoriaMes: Number(data.melhoriaMes) || 0,
        transcDia: data.dia === hoje ? Number(data.transcDia) || 0 : 0,
        melhoriaDia: data.dia === hoje ? Number(data.melhoriaDia) || 0 : 0,
        dia: data.dia,
      });
    }, () => {});

    return () => {
      unsubPlano();
      unsubUso();
    };
  }, [user]);

  useEffect(() => {
    const updateFinancialState = () => {
      const access = resolveFinancialAccess(planSource);
      const source = planSource as Record<string, unknown> | null;
      setFinancialAccess(access);
      setPlano({
        plano: access.operationalPlan,
        rawPlan: access.rawPlan,
        validade: access.expiresAt,
        stage: access.stage,
        accessStatus: String(source?.accessStatus || '') || null,
        financialStatus: String(source?.financialStatus || '') || null,
        regularizationDaysRemaining: access.regularizationDaysRemaining,
        isBlocked: access.isBlocked,
      });
    };

    updateFinancialState();
    const timer = window.setInterval(updateFinancialState, 60_000);
    return () => window.clearInterval(timer);
  }, [planSource]);

  // Sync Obras from Firestore when authenticated
  useEffect(() => {
    if (!user) return;
    setCarregandoObras(true);

    const q = query(collection(db, 'obras'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const obrasList: Obra[] = [];
      snapshot.forEach((obraDoc) => {
        obrasList.push({ id: obraDoc.id, ...obraDoc.data() } as Obra);
      });

      const quando = (obra: unknown): number => {
        const record = obra as { updatedAt?: unknown; createdAt?: unknown };
        return valueToMillis(record.updatedAt ?? record.createdAt);
      };
      obrasList.sort((a, b) => quando(b) - quando(a));
      setObras(obrasList);
      setCarregandoObras(false);
    }, (error) => {
      console.error('Erro no listener (obras):', error);
      setCarregandoObras(false);
    });

    return unsubscribe;
  }, [user]);

  // Mantém a obra selecionada sincronizada com arquivamento/reativação feitos pelo servidor.
  useEffect(() => {
    if (!selectedObra) return;
    const current = obras.find((obra) => obra.id === selectedObra.id);
    if (!current) {
      setSelectedObra(null);
      setSelectedDiario(null);
      setEditingDiario(null);
      setCurrentView('dashboard');
      return;
    }
    setSelectedObra(current);
  }, [obras, selectedObra?.id]);

  // Sync Diarios and Fotos for selected Obra
  useEffect(() => {
    if (!user || !selectedObra) {
      setDiarios([]);
      setFotos([]);
      return;
    }

    const diariosPath = `obras/${selectedObra.id}/diarios`;
    const qDiarios = query(collection(db, diariosPath), where('ownerId', '==', user.uid));

    const unsubDiarios = onSnapshot(qDiarios, (snapshot) => {
      const diariosList: Diario[] = [];
      snapshot.forEach((diarioDoc) => {
        diariosList.push({ id: diarioDoc.id, ...diarioDoc.data() } as Diario);
      });
      diariosList.sort((a, b) => {
        const dateComp = String(b.data ?? '').localeCompare(String(a.data ?? ''));
        if (dateComp !== 0) return dateComp;
        return String(b.horario ?? '').localeCompare(String(a.horario ?? ''));
      });
      setDiarios(diariosList);
    }, (error) => {
      console.error('Erro no listener (diários):', error);
    });

    const activeUnsubscribes: (() => void)[] = [];
    const aggregatedPhotos: Record<string, Foto[]> = {};

    const syncPhotosForDiario = (diarioId: string) => {
      const path = `obras/${selectedObra.id}/diarios/${diarioId}/fotos`;
      const qFotos = query(collection(db, path), where('ownerId', '==', user.uid));
      const unsubscribe = onSnapshot(qFotos, (snapshot) => {
        const diaryPhotos: Foto[] = [];
        snapshot.forEach((photoDoc) => {
          diaryPhotos.push({ id: photoDoc.id, ...photoDoc.data() } as Foto);
        });
        aggregatedPhotos[diarioId] = diaryPhotos;
        setFotos(Object.values(aggregatedPhotos).flat());
      }, (error) => {
        console.error('Erro no listener (fotos):', error);
      });
      activeUnsubscribes.push(unsubscribe);
    };

    diarios.forEach((diario) => syncPhotosForDiario(diario.id));

    return () => {
      unsubDiarios();
      activeUnsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, selectedObra, diarios.map((diario) => diario.id).join(',')]);

  const setView = (
    view: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos',
    obra: Obra | null = null,
    diario: Diario | null = null,
  ) => {
    setCurrentView(view);
    if (obra !== undefined) setSelectedObra(obra);
    if (diario !== undefined) {
      setSelectedDiario(diario);
      setEditingDiario(diario);
    }

    if (view !== 'dashboard') {
      window.history.pushState(
        {
          appView: view,
          obraId: obra?.id || null,
          diarioId: diario?.id || null,
        },
        '',
        window.location.href,
      );
    }
  };

  // Obra Operations
  const createObra = async (obraData: Omit<Obra, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    if (limiteObrasAtingido) {
      throw new Error(`Seu plano permite ${LIMITES_PLANO[plano.plano].obrasAtivas} obras ativas. Arquive uma obra concluída para criar outra.`);
    }

    const path = 'obras';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...obraData,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateObra = async (id: string, obraData: Partial<Obra>): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');
    const path = `obras/${id}`;
    const safeData = { ...obraData };
    delete safeData.arquivada;
    try {
      await updateDoc(doc(db, 'obras', id), {
        ...safeData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteObra = async (_id: string): Promise<void> => {
    const message = 'A exclusão definitiva da obra está temporariamente bloqueada para proteger fotos e RDOs durante a homologação. Arquive a obra por enquanto; nenhum dado será perdido.';
    if (typeof window !== 'undefined') window.alert(message);
    throw new Error(message);
  };

  // Diario Operations
  const createDiario = async (
    diarioData: Omit<Diario, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    base64Photos: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[],
  ): Promise<string> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    if (selectedObra.arquivada) throw new Error('Esta obra está arquivada. Desarquive-a para registrar novos RDOs.');

    const diariosPath = `obras/${selectedObra.id}/diarios`;
    try {
      const obraRef = doc(db, 'obras', selectedObra.id);
      let numeroRdo: number;
      try {
        numeroRdo = await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(obraRef);
          const atual = (snap.data()?.proximoNumeroRdo as number) || (diarios.length + 1);
          const numero = Math.max(atual, diarios.length + 1);
          if (snap.exists()) {
            transaction.update(obraRef, { proximoNumeroRdo: numero + 1, updatedAt: serverTimestamp() });
          } else {
            const { id: _obraId, ...obraSemId } = selectedObra as Obra & { id: string };
            transaction.set(obraRef, {
              ...obraSemId,
              ownerId: user.uid,
              proximoNumeroRdo: numero + 1,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          return numero;
        });
      } catch (transactionError) {
        console.warn('Numeração via servidor falhou, usando numeração local:', transactionError);
        numeroRdo = diarios.length + 1;
      }

      const hashIntegridade = await calcularHashRdo({
        obraId: selectedObra.id,
        numeroRdo,
        data: diarioData.data,
        horario: diarioData.horario,
        clima: diarioData.clima || '',
        equipe: diarioData.equipe || '',
        atividades: diarioData.atividades || '',
        materiais: diarioData.materiais || '',
        ocorrencias: diarioData.ocorrencias || '',
        observacoes: diarioData.observacoes || '',
        gps: diarioData.gps || null,
      });

      const docRef = doc(collection(db, diariosPath));
      const gravacaoDiario = setDoc(docRef, {
        ...diarioData,
        numeroRdo,
        hashIntegridade,
        origem: 'app',
        obraId: selectedObra.id,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (navigator.onLine) {
        await gravacaoDiario;
      } else {
        gravacaoDiario.catch((error) => console.error('Sincronização pendente do diário:', error));
      }

      const diaryId = docRef.id;
      const photosPath = `${diariosPath}/${diaryId}/fotos`;
      for (let index = 0; index < base64Photos.length; index += 1) {
        const photo = base64Photos[index];
        const url = await uploadFoto(photo.url, `${selectedObra.id}/${diaryId}/foto-${Date.now()}-${index}`);
        const gravacaoFoto = addDoc(collection(db, photosPath), {
          diarioId: diaryId,
          obraId: selectedObra.id,
          url,
          legenda: photo.legenda,
          data: diarioData.data,
          horario: diarioData.horario,
          gps: photo.gps || diarioData.gps || null,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
        if (navigator.onLine) {
          await gravacaoFoto;
        } else {
          gravacaoFoto.catch((error) => console.error('Sincronização pendente de foto:', error));
        }
      }

      return diaryId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, diariosPath);
    }
  };

  const updateDiario = async (
    id: string,
    diarioData: Partial<Diario>,
    base64Photos?: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[],
  ): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    if (selectedObra.arquivada) throw new Error('Esta obra está arquivada. Desarquive-a para editar RDOs.');

    const diarioPath = `obras/${selectedObra.id}/diarios/${id}`;
    try {
      const original = diarios.find((diario) => diario.id === id);
      const combinado = { ...(original || {}), ...diarioData } as Diario;
      const hashIntegridade = await calcularHashRdo({
        obraId: selectedObra.id,
        numeroRdo: combinado.numeroRdo || 0,
        data: combinado.data || '',
        horario: combinado.horario || '',
        clima: combinado.clima || '',
        equipe: combinado.equipe || '',
        atividades: combinado.atividades || '',
        materiais: combinado.materiais || '',
        ocorrencias: combinado.ocorrencias || '',
        observacoes: combinado.observacoes || '',
        gps: combinado.gps || null,
      });

      const gravacaoEdicao = updateDoc(doc(db, 'obras', selectedObra.id, 'diarios', id), {
        ...diarioData,
        hashIntegridade,
        updatedAt: serverTimestamp(),
      });
      if (navigator.onLine) {
        await gravacaoEdicao;
      } else {
        gravacaoEdicao.catch((error) => console.error('Sincronização pendente da edição:', error));
      }

      if (base64Photos && base64Photos.length > 0) {
        const photosPath = `${diarioPath}/fotos`;
        for (let index = 0; index < base64Photos.length; index += 1) {
          const photo = base64Photos[index];
          const url = await uploadFoto(photo.url, `${selectedObra.id}/${id}/foto-${Date.now()}-${index}`);
          const gravacaoFotoEdicao = addDoc(collection(db, photosPath), {
            diarioId: id,
            obraId: selectedObra.id,
            url,
            legenda: photo.legenda,
            data: diarioData.data || new Date().toISOString().split('T')[0],
            horario: diarioData.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            gps: photo.gps || diarioData.gps || null,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
          });
          if (navigator.onLine) {
            await gravacaoFotoEdicao;
          } else {
            gravacaoFotoEdicao.catch((error) => console.error('Sincronização pendente de foto:', error));
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, diarioPath);
    }
  };

  const deleteDiario = async (id: string): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    try {
      await deleteDiaryAuthoritatively(user, selectedObra.id, id);
      if (selectedDiario?.id === id) {
        setSelectedDiario(null);
        setEditingDiario(null);
        setCurrentView('obra-dashboard');
      }
    } catch (error) {
      showActionError(error, 'Não foi possível excluir o RDO com segurança.');
    }
  };

  const deleteFoto = async (diarioId: string, fotoId: string): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    try {
      await deletePhotoAuthoritatively(user, selectedObra.id, diarioId, fotoId);
    } catch (error) {
      showActionError(error, 'Não foi possível excluir a foto com segurança.');
    }
  };

  const arquivarObra = async (id: string, arquivar: boolean): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');
    try {
      await setWorkArchived(user, id, arquivar);
      setObras((current) => current.map((obra) => (
        obra.id === id ? { ...obra, arquivada: arquivar } : obra
      )));
      setSelectedObra((current) => (
        current?.id === id ? { ...current, arquivada: arquivar } : current
      ));
    } catch (error) {
      showActionError(error, arquivar ? 'Não foi possível arquivar a obra.' : 'Não foi possível reativar a obra.');
    }
  };

  const limiteObrasAtingido = obras.filter((obra) => !obra.arquivada).length
    >= LIMITES_PLANO[plano.plano].obrasAtivas;

  return (
    <AppContext.Provider value={{
      user,
      loading,
      carregandoObras,
      obras,
      diarios,
      fotos,
      online,
      currentView,
      selectedObra,
      selectedDiario,
      editingDiario,
      showAgentesModal,
      selectedAgentId,
      openAgentesModal,
      closeAgentesModal,
      setView,
      createObra,
      updateObra,
      deleteObra,
      createDiario,
      updateDiario,
      deleteDiario,
      deleteFoto,
      plano,
      financialAccess,
      usoIa,
      arquivarObra,
      limiteObrasAtingido,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
