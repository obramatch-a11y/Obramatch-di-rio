import React from 'react';
import { Obra, Diario, Foto } from '../types';

interface RdoPrintBlockProps {
  obra: Obra;
  diario: Diario;
  fotos: Foto[];            // já filtradas por diarioId pelo chamador
  mostrarRodape?: boolean;  // true no PDF individual; false dentro da exportação conjunta
}

export default function RdoPrintBlock({ obra, diario, fotos, mostrarRodape = true }: RdoPrintBlockProps) {
  const secoes = [
    'atividades',
    diario.equipe && 'equipe',
    diario.materiais && 'materiais',
    diario.ocorrencias && 'ocorrencias',
    diario.observacoes && 'observacoes',
    fotos.length > 0 && 'fotos',
    'assinaturas'
  ].filter(Boolean) as string[];
  const num = (s: string) => secoes.indexOf(s) + 1;

  return (
    <div className="bg-white text-black p-8 font-serif leading-relaxed text-sm w-full">
      
      {/* Header Block */}
      <div className="border-b-4 border-[#D1D1D1] pb-4 mb-6 flex justify-between items-start">
        <div>
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase">ECOSSISTEMA OBRAMATCH</span>
          <h1 className="text-2xl font-black text-[#111111] font-sans tracking-tight mt-1">
            RELATÓRIO DIÁRIO DE OBRA{diario.numeroRdo ? ` — RDO Nº ${String(diario.numeroRdo).padStart(3, '0')}` : ''}
          </h1>
          <p className="text-xs text-neutral-500 italic mt-1">ObraMatch Diário · Relatório Técnico Diário de Execução</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-[#111111] font-mono">
            {new Date(diario.data + 'T12:00:00').toLocaleDateString('pt-BR')}
          </div>
          <div className="text-xs text-neutral-500 font-sans mt-0.5">Emissão: {new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Technical Metadata Table */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 p-4 bg-[#F4F4F4] rounded-xl font-sans text-xs border border-[#D1D1D1]">
        <div>
          <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">OBRA:</span>
          <span className="text-[#111111] font-bold text-sm">{obra.nome}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">CLIENTE:</span>
          <span className="text-[#111111] font-bold text-sm">{obra.cliente}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">RESPONSÁVEL TÉCNICO:</span>
          <span className="text-[#111111] font-semibold">{obra.responsavelTecnico}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">CLIMA / CONDIÇÕES:</span>
          <span className="text-[#111111] font-semibold">
            {diario.clima || 'Ensolarado'}
            {diario.climaOficial && (
              <span className="block text-[10px] text-neutral-500 font-normal mt-0.5">
                {diario.climaOficial.tempMin}°C a {diario.climaOficial.tempMax}°C · Precipitação: {diario.climaOficial.chuvaMm}mm · Fonte oficial: Open-Meteo
              </span>
            )}
            {diario.condicaoTrabalho && (
              <span className="block text-[10px] font-bold mt-0.5">
                Condição de trabalho: {diario.condicaoTrabalho}
              </span>
            )}
          </span>
        </div>
        {obra.endereco && (
          <div className="col-span-2">
            <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">LOCALIZAÇÃO:</span>
            <span className="text-[#111111] font-semibold">{obra.endereco}</span>
          </div>
        )}
        {diario.gps && (
          <div className="col-span-2">
            <span className="text-neutral-500 font-bold block uppercase tracking-wider text-[10px]">COORDENADAS GPS (REPORT):</span>
            <span className="text-[#111111] font-mono">📍 {diario.gps.latitude.toFixed(6)}, {diario.gps.longitude.toFixed(6)}</span>
          </div>
        )}
      </div>

      {/* Content Section: Atividades */}
      <div className="mb-6 font-sans">
        <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-3">
          {num('atividades')}. ATIVIDADES EXECUTADAS DO DIA
        </h3>
        <p className="text-[#111111] text-sm whitespace-pre-wrap leading-relaxed">
          {diario.atividades}
        </p>
      </div>

      {/* Content Section: Equipe & Materiais */}
      <div className="grid grid-cols-2 gap-6 mb-6 font-sans text-xs">
        {diario.equipe && (
          <div>
            <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-2">
              {num('equipe')}. EQUIPE PRESENTE
            </h3>
            <p className="text-[#222222] whitespace-pre-wrap leading-relaxed">
              {diario.equipe}
            </p>
          </div>
        )}
        {diario.materiais && (
          <div>
            <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-2">
              {num('materiais')}. MATERIAIS E EQUIPAMENTOS
            </h3>
            <p className="text-[#222222] whitespace-pre-wrap leading-relaxed">
              {diario.materiais}
            </p>
          </div>
        )}
      </div>

      {/* Content Section: Ocorrências */}
      {diario.ocorrencias && (
        <div className="mb-6 font-sans text-xs">
          <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-2">
            {num('ocorrencias')}. OCORRÊNCIAS / IMPREVISTOS
          </h3>
          <p className="text-red-800 font-bold whitespace-pre-wrap leading-relaxed">
            ⚠️ {diario.ocorrencias}
          </p>
        </div>
      )}

      {/* Content Section: Observações */}
      {diario.observacoes && (
        <div className="mb-6 font-sans text-xs">
          <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-2">
            {num('observacoes')}. OBSERVAÇÕES COMPLEMENTARES
          </h3>
          <p className="text-[#222222] whitespace-pre-wrap leading-relaxed">
            {diario.observacoes}
          </p>
        </div>
      )}

      {/* Photos grid */}
      {fotos.length > 0 && (
        <div className={"mb-8 font-sans" + (fotos.length > 2 ? " page-break-before" : "")}>
          <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-4">
            {num('fotos')}. REGISTRO FOTOGRÁFICO
          </h3>
          <div className="grid grid-cols-2 gap-6">
            {fotos.map((photo) => (
              <div key={photo.id} className="border border-[#D1D1D1] rounded-xl p-3 bg-[#F4F4F4] avoid-break">
                <div className="aspect-video w-full overflow-hidden rounded-lg mb-2">
                  <img src={photo.url} alt="Evidência" className="w-full h-full object-cover" />
                </div>
                {photo.legenda && (
                  <p className="text-[11px] text-[#222222] italic font-semibold">{photo.legenda}</p>
                )}
                <div className="flex justify-between items-center text-[10px] text-neutral-600 mt-1.5 font-mono">
                  <span>Hora: {photo.horario}</span>
                  {photo.gps && (
                    <span>GPS: {photo.gps.latitude.toFixed(5)}, {photo.gps.longitude.toFixed(5)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signatures footer block */}
      <div className="mt-12 pt-6 font-sans avoid-break">
        <h3 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider border-b border-[#D1D1D1] pb-1 mb-8">
          {num('assinaturas')}. ASSINATURAS
        </h3>
        <div className="grid grid-cols-2 gap-12">
          <div className="flex flex-col items-center avoid-break">
            {diario.assinatura ? (
              <div className="mb-2 flex justify-center h-20 items-end">
                <img src={diario.assinatura} alt="Assinatura do Responsável Técnico" className="max-h-20 object-contain" />
              </div>
            ) : (
              <div className="h-20" />
            )}
            <div className="w-full border-t border-[#D1D1D1] my-1"></div>
            <p className="text-xs font-bold text-[#111111] uppercase text-center">{obra.responsavelTecnico}</p>
            <p className="text-[10px] text-neutral-500">Responsável Técnico (CREA/CAU)</p>
          </div>
          <div className="flex flex-col items-center avoid-break">
            <div className="h-20" />
            <div className="w-full border-t border-[#D1D1D1] my-1"></div>
            <p className="text-xs font-bold text-[#111111] uppercase text-center">{obra.cliente}</p>
            <p className="text-[10px] text-neutral-500">Cliente / Contratante — Ciência do registro</p>
          </div>
        </div>
      </div>

      {/* Generation stamp in footer */}
      <div className="mt-16 text-center font-sans border-t border-[#D1D1D1] pt-4 flex flex-col items-center gap-1">
        {diario.hashIntegridade && (
          <p className="text-[9px] text-neutral-500 font-mono mb-1">
            🔒 Código de integridade (SHA-256): {diario.hashIntegridade}
          </p>
        )}
        {(diario.gps || diario.origem) && (
          <p className="text-[9px] text-neutral-500 font-mono mb-1">
            {diario.gps ? `GPS: ${diario.gps.latitude.toFixed(6)}, ${diario.gps.longitude.toFixed(6)}` : ''}
            {diario.gps && diario.origem ? ' · ' : ''}
            {diario.origem === 'telegram' ? 'Registrado via Telegram com confirmação do responsável' : diario.origem === 'app' ? 'Registrado via aplicativo' : ''}
          </p>
        )}
        {mostrarRodape && (
          <p className="text-[10px] text-neutral-500 font-bold">
            Documento gerado pelo ObraMatch Diário — obramatch.com.br
          </p>
        )}
      </div>
    </div>
  );
}
