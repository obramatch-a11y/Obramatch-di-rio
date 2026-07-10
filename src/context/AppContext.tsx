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
  deleteDoc, 
  doc, 
  serverTimestamp,
  runTransaction,
  getDocs
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../firebase';
import { Obra, Diario, Foto, OperationType } from '../types';
import { uploadFoto } from '../lib/storage';
import { calcularHashRdo } from '../lib/hash';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<Obra[]>([]);
  const [carregandoObras, setCarregandoObras] = useState(true);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

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
      
      // Se não há estado guardado, volta para dashboard (ponto inicial)
      if (!state || !state.appView) {
        setCurrentView('dashboard');
        setSelectedObra(null);
        setSelectedDiario(null);
        setEditingDiario(null);
        return;
      }

      // Restaurar a view anterior
      const targetView = state.appView as 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos';
      setCurrentView(targetView);

      // Se havia obra selecionada, restaurar (encontrar na lista local)
      if (state.obraId) {
        const foundObra = obras.find(o => o.id === state.obraId);
        setSelectedObra(foundObra || null);
      } else {
        setSelectedObra(null);
      }

      // Se havia diário selecionado, restaurar
      if (state.diarioId) {
        const foundDiario = diarios.find(d => d.id === state.diarioId);
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

  // Sync Obras from Firestore when authenticated
  useEffect(() => {
    if (!user) return;
    setCarregandoObras(true);

    const obrasPath = 'obras';
    const q = query(collection(db, obrasPath), where('ownerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const obrasList: Obra[] = [];
      snapshot.forEach((doc) => {
        obrasList.push({ id: doc.id, ...doc.data() } as Obra);
      });
      // Ordena por data de atualização/criação de forma ROBUSTA: aceita tanto
      // timestamp do Firestore ({seconds}) quanto texto ISO (formato gravado
      // pelo bot do Telegram). Assim uma obra criada pelo bot nunca derruba a
      // lista inteira (causava "0 obras" mesmo com a obra existindo).
      const quando = (o: any): number => {
        const v = o?.updatedAt ?? o?.createdAt;
        if (!v) return 0;
        if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
        if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
        if (typeof v?.toDate === 'function') { try { return v.toDate().getTime(); } catch { return 0; } }
        return 0;
      };
      obrasList.sort((a, b) => quando(b) - quando(a));
      setObras(obrasList);
      setCarregandoObras(false);
    }, (error) => {
      console.error('Erro ao ouvir obras:', error);
      setCarregandoObras(false);
      handleFirestoreError(error, OperationType.LIST, obrasPath);
    });

    return unsubscribe;
  }, [user]);

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
      snapshot.forEach((doc) => {
        diariosList.push({ id: doc.id, ...doc.data() } as Diario);
      });
      // Ordena por data e horário (mais recente primeiro), de forma robusta:
      // trata qualquer campo ausente ou de tipo inesperado como texto vazio,
      // para que UM diário mal formado nunca derrube a lista inteira.
      diariosList.sort((a, b) => {
        const dataA = String((a as any).data ?? '');
        const dataB = String((b as any).data ?? '');
        const dateComp = dataB.localeCompare(dataA);
        if (dateComp !== 0) return dateComp;
        const horaA = String((a as any).horario ?? '');
        const horaB = String((b as any).horario ?? '');
        return horaB.localeCompare(horaA);
      });
      setDiarios(diariosList);
    }, (error) => {
      console.error('Erro ao ouvir diários:', error);
      handleFirestoreError(error, OperationType.LIST, diariosPath);
    });

    // Subcollection query for all fotos in the diaries of this Obra
    const fotosPath = `obras/${selectedObra.id}/diarios`;
    // To sync fotos easily, we listen to them or fetch them directly in an onSnapshot inside diários
    // Since firestore doesn't easily let us query across multiple nested levels without collectionGroup,
    // we can sync photos in subcollections for the active diários. Let's make a real listener for each diario's photos
    const activeUnsubscribes: (() => void)[] = [];

    // Let's create an aggregated list of photos
    const aggregatedPhotos: { [diarioId: string]: Foto[] } = {};

    const syncPhotosForDiario = (diarioId: string) => {
      const path = `obras/${selectedObra.id}/diarios/${diarioId}/fotos`;
      const qFotos = query(collection(db, path), where('ownerId', '==', user.uid));
      
      const unsub = onSnapshot(qFotos, (snapshot) => {
        const diaryPhotos: Foto[] = [];
        snapshot.forEach((doc) => {
          diaryPhotos.push({ id: doc.id, ...doc.data() } as Foto);
        });
        aggregatedPhotos[diarioId] = diaryPhotos;
        
        // Flatten and update state
        const allFotos = Object.values(aggregatedPhotos).flat();
        setFotos(allFotos);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
      activeUnsubscribes.push(unsub);
    };

    // We can run this whenever diaries update
    diarios.forEach((d) => {
      syncPhotosForDiario(d.id);
    });

    return () => {
      unsubDiarios();
      activeUnsubscribes.forEach((unsub) => unsub());
    };
  }, [user, selectedObra, diarios.map(d => d.id).join(',')]);

  const setView = (
    view: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline' | 'exportar-rdos', 
    obra: Obra | null = null, 
    diario: Diario | null = null
  ) => {
    setCurrentView(view);
    if (obra !== undefined) setSelectedObra(obra);
    if (diario !== undefined) {
      setSelectedDiario(diario);
      setEditingDiario(diario);
    }
    
    // Guardar estado na history para suportar o botão voltar do Android
    // Estado inicial (dashboard) não cria entrada para evitar múltiplas entradas
    if (view !== 'dashboard') {
      window.history.pushState(
        { 
          appView: view,
          obraId: obra?.id || null,
          diarioId: diario?.id || null
        },
        '',
        window.location.href
      );
    }
  };

  // Obra Operations
  const createObra = async (obraData: Omit<Obra, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!user) throw new Error('Usuário não autenticado');
    
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
    try {
      await updateDoc(doc(db, 'obras', id), {
        ...obraData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteObra = async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');
    const path = `obras/${id}`;
    try {
      // 1. Buscar todos os diários da obra
      const diariosSnap = await getDocs(query(collection(db, 'obras', id, 'diarios'), where('ownerId', '==', user.uid)));
      for (const d of diariosSnap.docs) {
        // 2. Buscar e deletar fotos de cada diário
        const fotosSnap = await getDocs(query(collection(db, 'obras', id, 'diarios', d.id, 'fotos'), where('ownerId', '==', user.uid)));
        for (const f of fotosSnap.docs) {
          await deleteDoc(doc(db, 'obras', id, 'diarios', d.id, 'fotos', f.id));
        }
        // 3. Deletar o diário
        await deleteDoc(doc(db, 'obras', id, 'diarios', d.id));
      }
      // 4. Por fim, deletar a obra
      await deleteDoc(doc(db, 'obras', id));
      
      if (selectedObra?.id === id) {
        setSelectedObra(null);
        setCurrentView('dashboard');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Diario Operations
  const createDiario = async (
    diarioData: Omit<Diario, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    base64Photos: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]
  ): Promise<string> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    
    const diariosPath = `obras/${selectedObra.id}/diarios`;
    try {
      // Numeração sequencial do RDO (transação sobre o documento da obra).
      // BLINDAGEM: se a transação falhar por qualquer motivo (documento da
      // obra em estado estranho no servidor), usa numeração local e segue —
      // o diário é o que importa e será salvo mesmo assim.
      const obraRef = doc(db, 'obras', selectedObra.id);
      let numeroRdo: number;
      try {
        numeroRdo = await runTransaction(db, async (tx) => {
        const snap = await tx.get(obraRef);
        const atual = (snap.data()?.proximoNumeroRdo as number) || (diarios.length + 1);
        const numero = Math.max(atual, diarios.length + 1);
        if (snap.exists()) {
          tx.update(obraRef, { proximoNumeroRdo: numero + 1, updatedAt: serverTimestamp() });
        } else {
          // A obra ainda não existe no servidor (ficou presa no cache local
          // enquanto as gravações eram recusadas). Grava ela inteira agora.
          const { id: _obraId, ...obraSemId } = selectedObra as any;
          tx.set(obraRef, {
            ...obraSemId,
            ownerId: user.uid,
            proximoNumeroRdo: numero + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        return numero;
      });
      } catch (txErr: any) {
        console.warn('Numeração via servidor falhou, usando numeração local:', txErr?.message || txErr);
        numeroRdo = diarios.length + 1;
      }
      // Código de integridade (SHA-256 do conteúdo canônico)
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

      // Add the diary document.
      // OFFLINE: com o cache persistente, a gravação local é imediata, mas a
      // promessa só resolve quando o servidor confirma. Sem internet, esperar
      // travaria o "Salvar" para sempre. Então: cria a referência, dispara a
      // gravação e só ESPERA a confirmação quando há conexão. Offline, o RDO
      // fica salvo no aparelho e sincroniza sozinho quando a internet voltar.
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
        gravacaoDiario.catch((e) => console.error('Sincronização pendente do diário:', e));
      }

      const diaryId = docRef.id;

      // Fotos: upload ao Supabase Storage (fallback: base64) e gravação da URL
      const photosPath = `${diariosPath}/${diaryId}/fotos`;
      for (let i = 0; i < base64Photos.length; i++) {
        const photo = base64Photos[i];
        const url = await uploadFoto(photo.url, `${selectedObra.id}/${diaryId}/foto-${Date.now()}-${i}`);
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
          gravacaoFoto.catch((e) => console.error('Sincronização pendente de foto:', e));
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
    base64Photos?: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]
  ): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    
    const diarioPath = `obras/${selectedObra.id}/diarios/${id}`;
    try {
      // Recalcula o código de integridade quando os campos do RDO mudam
      const original = diarios.find((d) => d.id === id);
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
        gravacaoEdicao.catch((e) => console.error('Sincronização pendente da edição:', e));
      }

      // If new photos were provided, add them as well
      if (base64Photos && base64Photos.length > 0) {
        const photosPath = `${diarioPath}/fotos`;
        for (let i = 0; i < base64Photos.length; i++) {
          const photo = base64Photos[i];
          const url = await uploadFoto(photo.url, `${selectedObra.id}/${id}/foto-${Date.now()}-${i}`);
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
            gravacaoFotoEdicao.catch((e) => console.error('Sincronização pendente de foto:', e));
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, diarioPath);
    }
  };

  const deleteDiario = async (id: string): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    
    const diarioPath = `obras/${selectedObra.id}/diarios/${id}`;
    try {
      const fotosSnap = await getDocs(query(collection(db, 'obras', selectedObra.id, 'diarios', id, 'fotos'), where('ownerId', '==', user.uid)));
      for (const f of fotosSnap.docs) {
        await deleteDoc(doc(db, 'obras', selectedObra.id, 'diarios', id, 'fotos', f.id));
      }
      await deleteDoc(doc(db, 'obras', selectedObra.id, 'diarios', id));
      if (selectedDiario?.id === id) {
        setSelectedDiario(null);
        setCurrentView('obra-dashboard');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, diarioPath);
    }
  };

  const deleteFoto = async (diarioId: string, fotoId: string): Promise<void> => {
    if (!user || !selectedObra) throw new Error('Usuário ou Obra não selecionada');
    const path = `obras/${selectedObra.id}/diarios/${diarioId}/fotos/${fotoId}`;
    try {
      await deleteDoc(doc(db, 'obras', selectedObra.id, 'diarios', diarioId, 'fotos', fotoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

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
      deleteFoto
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
