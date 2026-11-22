import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DialogContext, registrarDialogoGlobal, type DialogApi } from './dialogContext';
import './app-dialog.css';

type Request =
  | { kind: 'confirm'; title?: string; message: string; confirmLabel: string; cancelLabel: string; danger: boolean; expected?: string; resolve: (value: boolean) => void }
  | { kind: 'alert'; title?: string; message: string; resolve: () => void };

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';

function DialogView({ request, onClose }: { key?: string | number; request: Request; onClose: (confirmed: boolean) => void }) {
  const titleId = useId();
  const messageId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');
  const expected = request.kind === 'confirm' ? request.expected : undefined;
  const danger = request.kind === 'confirm' && request.danger;
  const canConfirm = expected === undefined || typed === expected;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (expected !== undefined ? inputRef.current : danger ? cancelRef.current : okRef.current)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [expected, danger]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose(false);
      return;
    }
    if (event.key !== 'Tab' || !boxRef.current) return;
    const items = Array.from(boxRef.current.querySelectorAll(FOCUSABLE)) as HTMLElement[];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const isConfirm = request.kind === 'confirm';

  return (
    <div className="app-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(false); }}>
      <div
        ref={boxRef}
        className="app-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={request.title ? titleId : undefined}
        aria-describedby={messageId}
        onKeyDown={onKeyDown}
      >
        {request.title && <h2 id={titleId}>{request.title}</h2>}
        <p id={messageId}>{request.message}</p>
        {expected !== undefined && (
          <label className="app-dialog-typed">
            <span>Para confirmar, digite exatamente: <strong>{expected}</strong></span>
            <input
              ref={inputRef}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onKeyDown={(event) => { if (event.key === 'Enter' && canConfirm) onClose(true); }}
            />
          </label>
        )}
        <div className="app-dialog-actions">
          {isConfirm && (
            <button ref={cancelRef} type="button" className="app-dialog-cancel" onClick={() => onClose(false)}>
              {request.cancelLabel}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            className={danger ? 'app-dialog-ok is-danger' : 'app-dialog-ok'}
            disabled={!canConfirm}
            onClick={() => onClose(true)}
          >
            {isConfirm ? request.confirmLabel : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Substitui alert/confirm/prompt do navegador por diálogos do próprio aplicativo. */
export default function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);

  const enqueue = useCallback((request: Request) => setQueue((current) => [...current, request]), []);

  const api = useMemo<DialogApi>(() => ({
    confirm: ({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) =>
      new Promise<boolean>((resolve) => enqueue({ kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, resolve })),
    alert: (message, title) =>
      new Promise<void>((resolve) => enqueue({ kind: 'alert', title, message, resolve })),
    confirmTyping: ({ title, message, expected, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = true }) =>
      new Promise<boolean>((resolve) => enqueue({ kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, expected, resolve })),
  }), [enqueue]);

  useEffect(() => {
    registrarDialogoGlobal(api);
    return () => registrarDialogoGlobal(null);
  }, [api]);

  const current = queue[0];
  const close = (confirmed: boolean) => {
    if (!current) return;
    if (current.kind === 'alert') current.resolve();
    else current.resolve(confirmed);
    setQueue((items) => items.slice(1));
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={queue.length + current.message} request={current} onClose={close} />}
    </DialogContext.Provider>
  );
}
