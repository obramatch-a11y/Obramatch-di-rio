import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function RdoAdminLockBoundary({ children }: { children: ReactNode }) {
  const { currentView, selectedDiario, selectedObra, setView } = useApp();
  const isRdoView = currentView === 'diario-detail' || currentView === 'diario-form';

  if (!isRdoView || !selectedDiario?.lockedByAdmin) return <>{children}</>;

  return (
    <main className="flex-1 flex items-center justify-center p-5 bg-[#F4F4F4]">
      <section className="w-full max-w-xl bg-white border-2 border-black rounded-2xl p-7 text-center shadow-[6px_6px_0_#111]">
        <LockKeyhole className="w-12 h-12 mx-auto mb-4 text-red-700" />
        <h1 className="text-2xl font-black mb-3">RDO bloqueado administrativamente</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Este RDO está temporariamente indisponível para abertura, edição, fotos, exclusão e geração de relatório.
        </p>
        {selectedDiario.adminLockReason && (
          <p className="mt-4 text-sm font-bold">Motivo: {selectedDiario.adminLockReason}</p>
        )}
        <button
          type="button"
          className="mt-6 px-5 py-3 bg-[#0A3D91] text-white border-2 border-black rounded-xl font-black"
          onClick={() => setView('obra-dashboard', selectedObra, null)}
        >
          Voltar para a obra
        </button>
      </section>
    </main>
  );
}
