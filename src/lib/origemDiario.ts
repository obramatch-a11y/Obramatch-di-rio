import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { calcularHashRdo } from './hash';
import type { Obra } from '../types';

export interface CamposTexto {
  atividades: string; equipe: string; materiais: string; ocorrencias: string; observacoes: string;
}

/**
 * RDOs enviados do Diário pessoal guardam o hash do original. Com ele, acha-se o RDO de origem entre as
 * obras da própria conta (mesma regra de propriedade do servidor), em qualquer aparelho.
 */
export async function localizarDiarioDeOrigem(uid: string, obras: Obra[], hashOrigem: string) {
  if (!hashOrigem) return null;
  for (const obra of obras.filter((o) => !o.empresa)) {
    const achados = await getDocs(query(
      collection(db, 'obras', obra.id, 'diarios'),
      where('ownerId', '==', uid), where('hashIntegridade', '==', hashOrigem),
    ));
    if (!achados.empty) return { obra, id: achados.docs[0].id, dados: achados.docs[0].data() as Record<string, any> };
  }
  return null;
}

/** Grava a correção no RDO original (com novo hash de integridade), como a edição normal do Diário. */
export async function corrigirDiarioDeOrigem(
  origem: { obra: Obra; id: string; dados: Record<string, any> }, texto: CamposTexto,
): Promise<void> {
  const combinado: Record<string, any> = { ...origem.dados, ...texto };
  const hashIntegridade = await calcularHashRdo({
    obraId: origem.obra.id,
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
  await updateDoc(doc(db, 'obras', origem.obra.id, 'diarios', origem.id), { ...texto, hashIntegridade, updatedAt: serverTimestamp() });
}
