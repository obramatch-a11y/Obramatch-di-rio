import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const financialAccess = read('src/lib/financialAccess.ts');
const boundary = read('src/components/FinancialAccessBoundary.tsx');
const appContext = read('src/context/AppContext.tsx');
const dashboard = read('src/components/Dashboard.tsx');
const rules = read('firestore.rules');
const worker = read('worker/index.ts');
const proxy = read('functions/_lib/authoritativeProxy.ts');
const app = read('src/App.tsx');

assert(financialAccess.includes('FINANCIAL_WARNING_DAYS = 5'), 'aviso deve começar cinco dias antes');
assert(financialAccess.includes('FINANCIAL_REGULARIZATION_DAYS = 5'), 'prazo de regularização deve ser de cinco dias');
assert(financialAccess.includes("stage: 'overdue'"), 'vencimento deve possuir estado overdue');
assert(financialAccess.includes("stage: 'blocked'"), 'fim do prazo deve possuir estado blocked');
assert(financialAccess.includes("operationalPlan: 'pro'"), 'durante regularização a operação deve permanecer Pro');

assert(app.includes('<FinancialAccessBoundary>'), 'aplicativo deve envolver as telas autenticadas no bloqueio financeiro');
assert(boundary.includes('Já renovei — verificar novamente'), 'app deve permitir verificar renovação sem link de pagamento');
assert(boundary.includes('Continuar no plano Free'), 'app deve oferecer escolha Free após bloqueio');
assert(boundary.includes('selectFreePlanAuthoritatively'), 'escolha Free do app deve usar servidor');
assert(!boundary.includes('/app/assinatura'), 'app não pode apontar para checkout interno');
assert(!boundary.includes('http://') && !boundary.includes('https://'), 'app não pode exibir URL financeira');
assert(!boundary.includes('href='), 'app não pode apresentar link financeiro');
assert(!boundary.toLowerCase().includes('carência'), 'comunicação não deve chamar o prazo de carência');

assert(appContext.includes('financialAccess'), 'contexto deve expor o estado financeiro');
assert(appContext.includes('assertWorkAvailable'), 'operações devem validar obra bloqueada');
assert(appContext.includes('lockedByPlan'), 'contexto deve respeitar bloqueio por plano');
assert(dashboard.includes('!o.lockedByPlan'), 'lista operacional não deve exibir obra bloqueada como ativa');
assert(boundary.includes('deleteWorkAuthoritatively'), 'painel de obras bloqueadas deve permitir somente exclusão autoritativa');

assert(rules.includes("duration.value(5, 'd')"), 'regra do Firestore deve aplicar os cinco dias');
assert(rules.includes('isFinanciallyBlocked()'), 'regra deve bloquear alterações financeiras vencidas');
assert(rules.includes('workIsUnlocked(obraId)'), 'RDOs e fotos devem validar desbloqueio da obra');
assert(rules.includes('allow delete: if false;'), 'exclusões diretas pelo cliente devem permanecer negadas');

assert(worker.includes("pathname === '/api/payments/cancel'"), 'Worker deve registrar escolha Free');
assert(worker.includes("pathname === '/api/obras/request-delete'"), 'Worker deve registrar exclusão de obra bloqueada');
assert(proxy.includes("'/api/payments/cancel'"), 'proxy deve autorizar escolha Free');
assert(proxy.includes("'/api/obras/request-delete'"), 'proxy deve autorizar exclusão de obra');

console.log('Avisos e bloqueios financeiros do aplicativo: OK');
