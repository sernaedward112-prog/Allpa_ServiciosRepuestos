import { ArrowRight, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';
import { PERU_REGIONS } from '../shared/types';

interface QuickPrequalifierWidgetProps {
  onRouteToService: (regionId: string, urgency: 'programado' | 'emergencia_24h') => void;
  onRouteToParts: () => void;
}

const WHATSAPP_NUMBER = '51926281039';

export function QuickPrequalifierWidget({
  onRouteToService,
  onRouteToParts,
}: QuickPrequalifierWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [need, setNeed] = useState<'servicio' | 'repuesto'>('servicio');
  const [regionId, setRegionId] = useState<string>('ica_valles');
  const [urgency, setUrgency] = useState<'programado' | 'emergencia_24h'>('programado');

  const selectedRegion = PERU_REGIONS.find((r) => r.id === regionId) ?? PERU_REGIONS[0];

  const handleContinue = () => {
    setIsOpen(false);
    if (need === 'servicio') {
      onRouteToService(regionId, urgency);
    } else {
      onRouteToParts();
    }
  };

  const whatsappDirectUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola Allpa SAC, consulta precalificada:\n• Necesidad: ${
      need === 'servicio' ? 'Servicio de Mantenimiento / Operador' : 'Compra de Repuesto'
    }\n• Región: ${selectedRegion.label}\n• Urgencia: ${
      urgency === 'emergencia_24h' ? 'Emergencia 24h (máquina parada)' : 'Programado'
    }`
  )}`;

  return (
    <div
      className="fixed right-4 sm:right-5 z-40"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] max-w-96 bg-white border border-[#DCE4F0] rounded-xl shadow-lg overflow-hidden anim-pop origin-bottom-right">
          <div className="px-4 py-3 bg-[#0B2545] text-white flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-bold">Precalificador de Consulta</p>
              <p className="text-[11px] text-[#FBBF24]">
                Define necesidad, región y urgencia en 3 pasos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar asistente de consulta"
              className="p-1 text-[#D4E0F0] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            <div>
              <p className="font-semibold text-[#0B2545] mb-1.5">1. ¿Qué necesitas hoy?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNeed('servicio')}
                  className={`py-2 px-2.5 rounded-lg border font-semibold cursor-pointer ${
                    need === 'servicio'
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                  }`}
                >
                  Servicio en campo
                </button>
                <button
                  type="button"
                  onClick={() => setNeed('repuesto')}
                  className={`py-2 px-2.5 rounded-lg border font-semibold cursor-pointer ${
                    need === 'repuesto'
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                  }`}
                >
                  Repuestos / Stock
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="prequal-region"
                className="block font-semibold text-[#0B2545] mb-1.5"
              >
                2. ¿En qué región te encuentras?
              </label>
              <select
                id="prequal-region"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full px-3 py-2 border border-[#C7D3E6] rounded-lg bg-white text-[#0B2545]"
              >
                {PERU_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="font-semibold text-[#0B2545] mb-1.5">3. Nivel de urgencia</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('programado')}
                  className={`py-2 px-2.5 rounded-lg border font-medium cursor-pointer ${
                    urgency === 'programado'
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                      : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                  }`}
                >
                  Programado
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('emergencia_24h')}
                  className={`py-2 px-2.5 rounded-lg border font-medium cursor-pointer ${
                    urgency === 'emergencia_24h'
                      ? 'bg-[#EA580C] text-white border-[#EA580C]'
                      : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                  }`}
                >
                  Emergencia 24h
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DCE4F0] space-y-2">
              <button
                type="button"
                onClick={handleContinue}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
              >
                <span>
                  {need === 'servicio'
                    ? 'Ir al Cotizador con mi zona'
                    : 'Ver Stock Real de Repuestos'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 font-medium text-[#0B2545] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] rounded-lg"
              >
                <span>Derivar datos precalificados a WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir asistente de consulta"
          className="inline-flex items-center justify-center gap-2 w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 text-sm font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] border border-[#D97706]/30 rounded-full sm:rounded-lg shadow-md transition-colors cursor-pointer"
        >
          <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 text-[#0B2545]" aria-hidden="true" />
          <span className="hidden sm:inline">Asistente de Consulta</span>
        </button>
      )}
    </div>
  );
}
