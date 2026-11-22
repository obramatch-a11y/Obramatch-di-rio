import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva: o botão fica vermelho e o foco inicial vai para "Cancelar". */
  danger?: boolean;
}

export interface TypedConfirmOptions extends ConfirmOptions {
  /** Texto que a pessoa precisa digitar exatamente para liberar o botão de confirmar. */
  expected: string;
}

export interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  confirmTyping: (options: TypedConfirmOptions) => Promise<boolean>;
}

/** Usado apenas quando não há DialogProvider (por exemplo, em testes isolados). */
const nativeDialog: DialogApi = {
  confirm: async ({ message }) => window.confirm(message),
  alert: async (message) => { window.alert(message); },
  confirmTyping: async ({ message, expected }) => window.prompt(`${message}\n${expected}`) === expected,
};

export const DialogContext = createContext<DialogApi | null>(null);

// Ponte para código fora de componentes (por exemplo, funções do AppContext que avisam erros).
let dialogoGlobal: DialogApi | null = null;
export function registrarDialogoGlobal(api: DialogApi | null) {
  dialogoGlobal = api;
}
export function avisoGlobal(message: string, title?: string): Promise<void> {
  return (dialogoGlobal ?? nativeDialog).alert(message, title);
}

export function useDialog(): DialogApi {
  return useContext(DialogContext) ?? nativeDialog;
}
