import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-obramatch', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'obras/normal'), { ownerId: 'alice', arquivada: false });
    await setDoc(doc(db, 'obras/bloqueada'), { ownerId: 'alice', lockedByPlan: true });
    await setDoc(doc(db, 'obras/arquivada'), { ownerId: 'alice', arquivada: true });
    await setDoc(doc(db, 'obras/normal/diarios/1'), { ownerId: 'alice', obraId: 'normal' });
    await setDoc(doc(db, 'obras/normal/diarios/2'), { ownerId: 'alice', obraId: 'normal', lockedByAdmin: true });
  });
  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();
  await assertSucceeds(updateDoc(doc(alice, 'obras/normal'), { nome: 'Reforma' }));
  await assertFails(updateDoc(doc(alice, 'obras/normal'), { lockedByPlan: false }));
  await assertFails(updateDoc(doc(bob, 'obras/normal'), { nome: 'Outra conta' }));
  await assertFails(updateDoc(doc(alice, 'obras/bloqueada'), { nome: 'Bloqueada' }));
  await assertFails(setDoc(doc(alice, 'obras/arquivada/diarios/1'), { ownerId: 'alice', obraId: 'arquivada' }));
  await assertFails(setDoc(doc(alice, 'obras/bloqueada/diarios/1'), { ownerId: 'alice', obraId: 'bloqueada' }));
  await assertSucceeds(updateDoc(doc(alice, 'obras/normal/diarios/1'), { atividades: 'Teste' }));
  await assertFails(updateDoc(doc(alice, 'obras/normal/diarios/2'), { atividades: 'Teste' }));
  await assertFails(setDoc(doc(alice, 'obras/normal/diarios/2/fotos/1'), { ownerId: 'alice' }));
  console.log('Regras de propriedade e bloqueio: OK');
} finally {
  await env.cleanup();
}

