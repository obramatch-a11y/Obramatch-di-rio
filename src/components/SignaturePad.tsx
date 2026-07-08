import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileText, Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange?: (hasSignature: boolean) => void;
  initialSignature?: string;
}

export interface SignaturePadRef {
  getSignatureUrl: () => string;
  clear: () => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange, initialSignature }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // Load initial signature if provided
    useEffect(() => {
      if (initialSignature && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature(true);
          };
          img.src = initialSignature;
        }
      }
    }, [initialSignature]);

    const startDrawing = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a'; // Dark ink: visible in printed PDF
    };

    const draw = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
      onSignatureChange?.(true);
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSignatureChange?.(false);
    };

    // Export signature as data URL
    const getSignatureUrl = (): string => {
      if (!hasSignature || !canvasRef.current) return '';

      const origem = canvasRef.current;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = origem.width;
      exportCanvas.height = origem.height;
      const ectx = exportCanvas.getContext('2d');

      if (ectx) {
        ectx.fillStyle = 'white';
        ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ectx.drawImage(origem, 0, 0);
        return exportCanvas.toDataURL('image/png');
      }
      return '';
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getSignatureUrl,
      clear: clearCanvas,
    }));

    return (
      <div className="pt-6 border-t border-[#D1D1D1] space-y-4">
        <div>
          <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF6F00]" />
            Assinatura do Responsável Técnico
          </h4>
          <p className="text-xs text-neutral-500 mt-1">
            Utilize seu dedo ou mouse na área abaixo para assinar este relatório diário.
          </p>
        </div>

        <div className="bg-[#F4F4F4] border border-[#D1D1D1] rounded-xl p-4 flex flex-col items-center max-w-md mx-auto relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={380}
            height={150}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="bg-white border-2 border-black rounded-xl cursor-crosshair max-w-full touch-none"
          />
          <div className="flex justify-between items-center w-full mt-3 text-xs text-neutral-600">
            <span>{hasSignature ? '✓ Assinado' : 'Toque acima para assinar'}</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#F4F4F4] rounded-xl text-red-600 hover:text-red-700 font-semibold cursor-pointer transition-all text-[11px]"
            >
              <Eraser className="w-3.5 h-3.5" />
              Limpar Assinatura
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
