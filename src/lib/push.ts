import { getApp } from 'firebase/app';
import type { User } from 'firebase/auth';
import '../firebase';
import { registrarAparelhoNaCentral } from './central';

// Chave pública (VAPID) do Cloud Messaging; não é segredo.
const CHAVE_VAPID = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY
  || 'BENN89EZbZp8e4R_LQqJpc_q4S5jygP1dsBlhBKgLWoxdCaFv7FMQMazepOyiGeABiJp-a53hzQ6zeqTXBRTMrk';
const ESCOPO = '/firebase-cloud-messaging-push-scope';

export type SituacaoPush = 'indisponivel' | 'pedir' | 'ativo' | 'negado';

export function situacaoPush(): SituacaoPush {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return 'indisponivel';
  if (!('Notification' in window) || !('PushManager' in window)) return 'indisponivel';
  if (Notification.permission === 'granted') return 'ativo';
  if (Notification.permission === 'denied') return 'negado';
  return 'pedir';
}

/** Registra este aparelho para receber avisos. Só pede permissão quando `pedirPermissao` é verdadeiro. */
export async function ativarNotificacoes(user: User, pedirPermissao: boolean): Promise<SituacaoPush> {
  const atual = situacaoPush();
  if (atual === 'indisponivel' || atual === 'negado') return atual;
  if (atual === 'pedir') {
    if (!pedirPermissao) return atual;
    const resposta = await Notification.requestPermission();
    if (resposta !== 'granted') return resposta === 'denied' ? 'negado' : 'pedir';
  }
  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return 'indisponivel';
    const registro = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: ESCOPO });
    const pushToken = await getToken(getMessaging(getApp()), { vapidKey: CHAVE_VAPID, serviceWorkerRegistration: registro });
    if (!pushToken) return 'indisponivel';
    await user.getIdToken();
    await registrarAparelhoNaCentral(pushToken);
    return 'ativo';
  } catch {
    return 'indisponivel';
  }
}
