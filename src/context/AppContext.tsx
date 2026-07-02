import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../firebase';
import { Obra, Diario, Foto, OperationType } from '../types';

interface AppContextType {
  user: User | null;
  loading: boolean;
  obras: Obra[];
  diarios: Diario[];
  fotos: Foto[];
  online: boolean;
  currentView: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline';
  selectedObra: Obra | null;
  selectedDiario: Diario | null;
  editingDiario: Diario | null;
  setView: (view: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline', obra?: Obra | null, diario?: Diario | null) => void;
  createObra: (obra: Omit<Obra, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateObra: (id: string, obra: Partial<Obra>) => Promise<void>;
  deleteObra: (id: string) => Promise<void>;
  createDiario: (diario: Omit<Diario, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>, base64Photos: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]) => Promise<string>;
  updateDiario: (id: string, diario: Partial<Diario>, base64Photos?: { url: string; legenda: string; gps?: { latitude: number; longitude: number } | null }[]) => Promise<void>;
  deleteDiario: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<Obra[]>([]);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

  // Navigation and State
  const [currentView, setCurrentView] = useState<'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline'>('dashboard');
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [selectedDiario, setSelectedDiario] = useState<Diario | null>(null);
  const [editingDiario, setEditingDiario] = useState<Diario | null>(null);

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

  // Sync Obras from Firestore when authenticated
  useEffect(() => {
    if (!user) return;

    const obrasPath = 'obras';
    const q = query(collection(db, obrasPath), where('ownerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const obrasList: Obra[] = [];
      snapshot.forEach((doc) => {
        obrasList.push({ id: doc.id, ...doc.data() } as Obra);
      });
      // Sort Obras by updated date or created date
      obrasList.sort((a, b) => {
        const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setObras(obrasList);
    }, (error) => {
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
      // Sort Diários by chronological date (and then time) descending
      diariosList.sort((a, b) => {
        const dateComp = b.data.localeCompare(a.data);
        if (dateComp !== 0) return dateComp;
        return b.horario.localeCompare(a.horario);
      });
      setDiarios(diariosList);
    }, (error) => {
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
    view: 'dashboard' | 'obra-dashboard' | 'diario-form' | 'diario-detail' | 'timeline', 
    obra: Obra | null = null, 
    diario: Diario | null = null
  ) => {
    setCurrentView(view);
    if (obra !== undefined) setSelectedObra(obra);
    if (diario !== undefined) {
      setSelectedDiario(diario);
      setEditingDiario(diario);
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
      // Add the diary document
      const docRef = await addDoc(collection(db, diariosPath), {
        ...diarioData,
        obraId: selectedObra.id,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const diaryId = docRef.id;

      // Add associated photos to subcollection
      const photosPath = `${diariosPath}/${diaryId}/fotos`;
      for (const photo of base64Photos) {
        await addDoc(collection(db, photosPath), {
          diarioId: diaryId,
          obraId: selectedObra.id,
          url: photo.url,
          legenda: photo.legenda,
          data: diarioData.data,
          horario: diarioData.horario,
          gps: photo.gps || diarioData.gps || null,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
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
      await updateDoc(doc(db, 'obras', selectedObra.id, 'diarios', id), {
        ...diarioData,
        updatedAt: serverTimestamp(),
      });

      // If new photos were provided, add them as well
      if (base64Photos && base64Photos.length > 0) {
        const photosPath = `${diarioPath}/fotos`;
        for (const photo of base64Photos) {
          await addDoc(collection(db, photosPath), {
            diarioId: id,
            obraId: selectedObra.id,
            url: photo.url,
            legenda: photo.legenda,
            data: diarioData.data || new Date().toISOString().split('T')[0],
            horario: diarioData.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            gps: photo.gps || diarioData.gps || null,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
          });
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
      await deleteDoc(doc(db, 'obras', selectedObra.id, 'diarios', id));
      if (selectedDiario?.id === id) {
        setSelectedDiario(null);
        setCurrentView('obra-dashboard');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, diarioPath);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      loading,
      obras,
      diarios,
      fotos,
      online,
      currentView,
      selectedObra,
      selectedDiario,
      editingDiario,
      setView,
      createObra,
      updateObra,
      deleteObra,
      createDiario,
      updateDiario,
      deleteDiario
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
