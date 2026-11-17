import { CheckCircle2, ClipboardList, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { InternalPartRequest, Product, PublicUserAccount } from '../shared/types';

interface InternalRequestModalProps {
  isOpen: boolean;
  preselectedProduct: Product | null;
  currentUser?: PublicUserAccount | null;
  authToken?: string | null;
  onClose: () => void;
  onRequestSubmitted: (req: InternalPartRequest) => void;
}

export function InternalRequestModal({
  isOpen,
  preselectedProduct,
  currentUser,
  authToken,
  onClose,
  onRequestSubmitted,
}: InternalRequestModalProps) {
  const [partName, setPartName] = useState<string>(preselectedProduct?.name ?? '');
  const [oemCode, setOemCode] = useState<string>(preselectedProduct?.sku ?? '');
  const [machineModel, setMachineModel] = useState<string>(
    preselectedProduct?.compatibleModels ?? ''
  );
  const [quantityNeeded, setQuantityNeeded] = useState<number>(1);
  const initialPersonType: 'RUC' | 'DNI' =
    currentUser?.documentType ??
    (currentUser?.rucOrDni?.replace(/\D/g, '').length === 8 ? 'DNI' : 'RUC');
  const [personType, setPersonType] = useState<'RUC' | 'DNI'>(initialPersonType);
  const [requesterName, setRequesterName] = useState<string>(currentUser?.name ?? '');
  const [companyOrFarm, setCompanyOrFarm] = useState<string>(
    initialPersonType === 'RUC' && currentUser?.companyOrFarm !== 'Persona Natural'
      ? (currentUser?.companyOrFarm ?? '')
      : ''
  );
  const [phone, setPhone] = useState<string>(currentUser?.phone ?? '');
  const [urgency, setUrgency] = useState<'normal' | 'urgente_parada_maquina'>('normal');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<InternalPartRequest | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const response = await fetch('/api/internal-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: preselectedProduct?.id,
          partName,
          oemCode,
          machineModel,
          quantityNeeded,
          requesterName,
          companyOrFarm: personType === 'RUC' ? companyOrFarm.trim() : 'Persona Natural',
          phone,
          urgency,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'No se pudo registrar la solicitud.');
        return;
      }
      setCreatedRequest(data as InternalPartRequest);
      onRequestSubmitted(data as InternalPartRequest);
    } catch {
      setErrorMessage('Error de conexión con Logística.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="internal-request-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/55 p-4 anim-fade"
    >
      <div className="bg-white border border-[#DCE4F0] rounded-xl w-full max-w-lg max-h-[92dvh] overflow-y-auto anim-pop">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B2545] text-white">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
            <h3 id="internal-request-title" className="font-display text-lg font-bold">
              Solicitar Repuesto al Interno
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 text-[#D4E0F0] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {createdRequest ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] border border-[#93C5FD] rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#0B2545]">
                    Solicitud registrada en Logística y Compras
                  </p>
                  <p className="text-xs text-[#344863] mt-1">
                    Código interno:{' '}
                    <span className="font-mono font-semibold">{createdRequest.id}</span>. El área de
                    logística gestionará la reposición o importación para{' '}
                    <strong>{createdRequest.partName}</strong> y te contactará al{' '}
                    <span className="font-mono">{createdRequest.phone}</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded-lg cursor-pointer"
              >
                Volver al catálogo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#475B75] leading-relaxed">
                Este requerimiento ingresa directamente a la bandeja interna de Logística para
                cotizar reposición inmediata con nuestros proveedores en Lima y fábrica.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Nombre del repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="Ej. Kit Disco de Embrague Sinterizado"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Código SKU / OEM
                  </label>
                  <input
                    type="text"
                    value={oemCode}
                    onChange={(e) => setOemCode(e.target.value)}
                    placeholder="Ej. RE238411"
                    className="w-full px-3 py-2 text-sm font-mono border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Cantidad requerida *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Máquina / Modelo compatible
                  </label>
                  <input
                    type="text"
                    value={machineModel}
                    onChange={(e) => setMachineModel(e.target.value)}
                    placeholder="Ej. Massey Ferguson 4292"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonType('RUC')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                      personType === 'RUC'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                    }`}
                  >
                    Empresa / Fundo (RUC)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonType('DNI');
                      setCompanyOrFarm('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                      personType === 'DNI'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                    }`}
                  >
                    Persona Natural (DNI)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    {personType === 'RUC' ? 'Nombre del solicitante *' : 'Tu nombre completo *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    WhatsApp / Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="926 281 039"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                {personType === 'RUC' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                      Fundo o Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyOrFarm}
                      onChange={(e) => setCompanyOrFarm(e.target.value)}
                      placeholder="Ej. Fundo San Martín S.A.C."
                      className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Prioridad
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) =>
                      setUrgency(e.target.value as 'normal' | 'urgente_parada_maquina')
                    }
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg bg-white focus:outline-none focus:border-[#1D4ED8]"
                  >
                    <option value="normal">Reposición estándar</option>
                    <option value="urgente_parada_maquina">Urgente (Máquina parada)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Observaciones adicionales
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Serie de motor, año o detalle de envío..."
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-[#475B75] hover:text-[#0B2545] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg cursor-pointer"
                >
                  {submitting ? 'Registrando...' : 'Enviar Solicitud Interna'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
