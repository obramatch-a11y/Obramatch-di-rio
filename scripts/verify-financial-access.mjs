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
const rdoAdminBoundary = read('src/components/RdoAdminLockBoundary.tsx');
const printBlock = read('src/components/RdoPrintBlock.tsx');
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
assert(app.includes('<RdoAdminLockBoundary>'), 'aplicativo deve envolver os RDOs no bloqueio administrativo');
assert(rdoAdminBoundary.includes('selectedDiario?.lockedByAdmin'), 'bloqueio administrativo deve observar o RDO selecionado');
assert(rdoAdminBoundary.includes('RDO bloqueado administrativamente'), 'usuário deve receber comunicação clara do bloqueio');
assert(printBlock.includes('if (diario.lockedByAdmin) return null'), 'RDO bloqueado não pode gerar relatório');
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
assert(rules.includes('hasPlanExpiry()'), 'regra deve reconhecer validade financeira legada');
assert(rules.includes('allKnownExpiryGracePeriodsFinished()'), 'regra deve respeitar o maior prazo financeiro conhecido');
assert(rules.includes('hasExplicitFinancialBlock()'), 'regra deve bloquear imediatamente revisão financeira');
assert(rules.includes("plan.accessStatus == 'manual_review'"), 'accessStatus manual_review deve bloquear');
assert(rules.includes("plan.financialStatus == 'manual_review'"), 'financialStatus manual_review deve bloquear');
assert(rules.includes("plan.keys().hasAny(['currentPeriodEnd'])"), 'regra deve considerar currentPeriodEnd');
assert(rules.includes("plan.keys().hasAny(['validade'])"), 'regra deve considerar validade');
assert(rules.includes('workBelongsToCurrentUser(obraId)'), 'subcoleções devem validar o dono da obra pai');
assert(rules.includes('workIsUnlocked(obraId)'), 'RDOs e fotos devem validar desbloqueio da obra');
assert(rules.includes('diaryIsUnlocked(obraId, diarioId)'), 'fotos devem validar bloqueio administrativo do RDO');
assert(rules.includes('newDiaryHasSafeAdminLockDefaults()'), 'cliente não pode criar RDO já marcado como bloqueado');
assert(rules.includes('clientDidNotChangeDiaryAdminLock()'), 'cliente não pode alterar campos de bloqueio administrativo');
assert(rules.includes("'lockedByAdmin', 'adminLockedAt', 'adminLockedBy', 'adminLockReason'"), 'todos os campos de bloqueio do RDO devem ser protegidos');
assert(rules.includes("'adminLockedBy', 'adminLockReason'"), 'metadados de bloqueio da obra devem ser protegidos');
assert(rules.includes('newWorkHasSafePlanLockDefaults()'), 'criação de obra deve aceitar somente valores seguros de bloqueio');
assert(rules.includes('.diff(resource.data)'), 'atualização do perfil deve proteger somente campos alterados');
assert(rules.includes('allow delete: if false;'), 'exclusões diretas pelo cliente devem permanecer negadas');

assert(worker.includes("pathname === '/api/payments/cancel'"), 'Worker deve registrar escolha Free');
assert(worker.includes("pathname === '/api/obras/request-delete'"), 'Worker deve registrar exclusão de obra bloqueada');
assert(proxy.includes("'/api/payments/cancel'"), 'proxy deve autorizar escolha Free');
assert(proxy.includes("'/api/obras/request-delete'"), 'proxy deve autorizar exclusão de obra');

console.log('Avisos e bloqueios financeiros e administrativos do aplicativo: OK');
