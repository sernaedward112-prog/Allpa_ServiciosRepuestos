import { PackageSearch, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PublicOrderTracking } from '../shared/types';
import { OrderLiveView } from './OrderLiveView';
import { readLastOrder, rememberLastOrder } from './trackingStorage';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Datos para abrir un pedido concreto sin pedirle al cliente que los escriba otra vez. */
  presetRef?: { id: string; phone: string } | null;
}

export function TrackOrderModal({ isOpen, onClose, presetRef }: TrackOrderModalProps) {
  const [ref, setRef] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrderTracking | null>(null);
  const [orderPhone, setOrderPhone] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const lookup = async (reference: string, cellphone: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/track?ref=${encodeURIComponent(reference.trim())}&phone=${encodeURIComponent(cellphone.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setError(data.error || 'No se pudo consultar el pedido.');
        return;
      }
      const found = data.order as PublicOrderTracking;
      setOrder(found);
      setOrderPhone(cellphone.trim());
      rememberLastOrder(found.id, cellphone.trim());
    } catch {
      setError('No hay conexión con el servidor. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const preset = presetRef ?? readLastOrder();
    if (preset) {
      setRef(preset.id);
      setPhone(preset.phone);
      void lookup(preset.id, preset.phone);
    } else {
      setOrder(null);
      setError(null);
    }
    dialogRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, presetRef?.id, presetRef?.phone]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ref.trim() || phone.replace(/\D/g, '').length < 9) {
      setError('Ingresa tu número de pedido (o código de pago) y el celular de 9 dígitos.');
      return;
    }
    void lookup(ref, phone);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-title"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-[#0B2545]/50 p-0 sm:p-4 anim-fade"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white w-full max-w-xl max-h-dvh sm:max-h-[92dvh] flex flex-col sm:rounded-2xl overflow-hidden outline-none anim-pop"
      >
        <div className="px-6 py-4 flex items-center justify-between bg-[#0B2545] text-white">
          <div className="flex items-center gap-2.5">
            <PackageSearch className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
            <h2 id="track-title" className="font-display text-lg font-bold">
              Seguir mi pedido
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar seguimiento"
            className="p-1.5 text-[#D4E0F0] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor="track-ref" className="block text-xs font-semibold text-[#0B2545] mb-1">
                N.° de pedido o código de pago
              </label>
              <input
                id="track-ref"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="PED-2026-105"
                className="w-full px-3 py-2 text-sm font-mono border border-[#C7D3E6] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="track-phone" className="block text-xs font-semibold text-[#0B2545] mb-1">
                Celular del pedido
              </label>
              <input
                id="track-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9 dígitos"
                className="w-full px-3 py-2 text-sm font-mono border border-[#C7D3E6] rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg cursor-pointer"
            >
              {loading ? 'Buscando…' : 'Consultar'}
            </button>
          </form>

          {error && (
            <p role="alert" className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {order ? (
            <OrderLiveView key={order.id} initialOrder={order} phone={orderPhone} />
          ) : (
            !error && (
              <p className="text-sm text-[#475B75] text-center py-6">
                Ingresa tu número de pedido y el celular con el que compraste para ver en qué etapa está.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
