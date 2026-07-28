export const FINANCIAL_WARNING_DAYS = 5;
export const FINANCIAL_REGULARIZATION_DAYS = 5;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type FinancialAccessStage = 'free' | 'pro_active' | 'pro_expiring' | 'overdue' | 'blocked';

export interface FinancialAccessInput {
  plano?: unknown;
  validade?: unknown;
  acessoAte?: unknown;
  currentPeriodEnd?: unknown;
  accessStatus?: unknown;
  financialStatus?: unknown;
}

export interface FinancialAccessState {
  stage: FinancialAccessStage;
  rawPlan: 'free' | 'pro';
  operationalPlan: 'free' | 'pro';
  expiresAt: string | null;
  expiresAtMs: number;
  lockAt: string | null;
  lockAtMs: number;
  daysUntilExpiry: number;
  daysOverdue: number;
  regularizationDaysRemaining: number;
  shouldWarn: boolean;
  isBlocked: boolean;
}

export function financialValueToMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object') {
    const candidate = value as {
      seconds?: unknown;
      _seconds?: unknown;
      toDate?: () => Date;
      toMillis?: () => number;
    };
    if (typeof candidate.toMillis === 'function') {
      try {
        const result = candidate.toMillis();
        return Number.isFinite(result) ? result : 0;
      } catch {
        return 0;
      }
    }
    if (typeof candidate.toDate === 'function') {
      try {
        return candidate.toDate().getTime();
      } catch {
        return 0;
      }
    }
    const seconds = typeof candidate.seconds === 'number'
      ? candidate.seconds
      : typeof candidate._seconds === 'number'
        ? candidate._seconds
        : 0;
    return seconds * 1000;
  }
  return 0;
}

function effectiveExpiryMs(input: FinancialAccessInput | null | undefined): number {
  const acessoAteMs = financialValueToMillis(input?.acessoAte);
  const currentPeriodEndMs = financialValueToMillis(input?.currentPeriodEnd);
  if (acessoAteMs || currentPeriodEndMs) return Math.max(acessoAteMs, currentPeriodEndMs);
  return financialValueToMillis(input?.validade);
}

export function resolveFinancialAccess(
  input: FinancialAccessInput | null | undefined,
  nowMs = Date.now(),
): FinancialAccessState {
  const rawPlan: 'free' | 'pro' = String(input?.plano || '').toLowerCase() === 'pro' ? 'pro' : 'free';
  const accessStatus = String(input?.accessStatus || '');
  const financialStatus = String(input?.financialStatus || '');
  const expiresAtMs = effectiveExpiryMs(input);
  const expiresAt = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;
  const lockAtMs = expiresAtMs ? expiresAtMs + FINANCIAL_REGULARIZATION_DAYS * DAY_MS : 0;
  const lockAt = lockAtMs ? new Date(lockAtMs).toISOString() : null;
  const base = {
    rawPlan,
    expiresAt,
    expiresAtMs,
    lockAt,
    lockAtMs,
    daysUntilExpiry: 0,
    daysOverdue: 0,
    regularizationDaysRemaining: 0,
  };

  const explicitlyBlocked = accessStatus === 'blocked_pending_choice'
    || accessStatus === 'manual_review'
    || financialStatus === 'blocked'
    || financialStatus === 'manual_review';
  if (explicitlyBlocked) {
    return {
      ...base,
      stage: 'blocked',
      operationalPlan: 'pro',
      daysOverdue: expiresAtMs ? Math.max(0, Math.floor((nowMs - expiresAtMs) / DAY_MS)) : 0,
      shouldWarn: true,
      isBlocked: true,
    };
  }

  if (rawPlan !== 'pro' || accessStatus === 'free_selected' || financialStatus === 'free') {
    return { ...base, stage: 'free', operationalPlan: 'free', shouldWarn: false, isBlocked: false };
  }

  const explicitlyOverdue = accessStatus === 'payment_overdue' || financialStatus === 'overdue';
  if (!expiresAtMs) {
    if (explicitlyOverdue) {
      return {
        ...base,
        stage: 'overdue',
        operationalPlan: 'pro',
        regularizationDaysRemaining: FINANCIAL_REGULARIZATION_DAYS,
        shouldWarn: true,
        isBlocked: false,
      };
    }
    return { ...base, stage: 'pro_active', operationalPlan: 'pro', shouldWarn: false, isBlocked: false };
  }

  if (nowMs >= lockAtMs) {
    return {
      ...base,
      stage: 'blocked',
      operationalPlan: 'pro',
      daysOverdue: Math.max(0, Math.floor((nowMs - expiresAtMs) / DAY_MS)),
      shouldWarn: true,
      isBlocked: true,
    };
  }

  if (explicitlyOverdue || nowMs >= expiresAtMs) {
    return {
      ...base,
      stage: 'overdue',
      operationalPlan: 'pro',
      daysOverdue: Math.max(0, Math.floor((nowMs - expiresAtMs) / DAY_MS)),
      regularizationDaysRemaining: Math.max(1, Math.ceil((lockAtMs - nowMs) / DAY_MS)),
      shouldWarn: true,
      isBlocked: false,
    };
  }

  const remainingMs = expiresAtMs - nowMs;
  const daysUntilExpiry = Math.max(1, Math.ceil(remainingMs / DAY_MS));
  if (remainingMs <= FINANCIAL_WARNING_DAYS * DAY_MS) {
    return {
      ...base,
      stage: 'pro_expiring',
      operationalPlan: 'pro',
      daysUntilExpiry,
      shouldWarn: true,
      isBlocked: false,
    };
  }

  return {
    ...base,
    stage: 'pro_active',
    operationalPlan: 'pro',
    daysUntilExpiry,
    shouldWarn: false,
    isBlocked: false,
  };
}
