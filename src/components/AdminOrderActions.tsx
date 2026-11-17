import { CheckCircle2, PackageCheck, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { PAYMENT_CHANNEL_LABELS, formatPaymentCode, type OrderStatus, type SparePartOrder } from '../shared/types';

interface AdminOrderActionsProps {
  order: SparePartOrder;
  busy: boolean;
  onChange: (
    order: SparePartOrder,
    status: OrderStatus,
    extra?: { trackingGuide?: string; shippingCarrier?: string }
  ) => void;
}

const CARRIERS = ['Shalom', 'Marvisur', 'Olva Courier', 'Reparto Directo Allpa'];

/** Acciones que el administrador puede hacer sobre un pedido según su etapa. */
export function AdminOrderActions({ order, busy, onChange }: AdminOrderActionsProps) {
  const initialCarrier =
    CARRIERS.find((c) => order.shippingCarrier.toLowerCase().includes(c.split(' ')[0].toLowerCase())) ??
    CARRIERS[0];
  const [carrier, setCarrier] = useState<string>(initialCarrier);
  const [guide, setGuide] = useState<string>(order.trackingGuide ?? '');
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);

  const primary =
    'hit-area inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 rounded-lg cursor-pointer';
  const secondary =
    'hit-area inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344863] bg-white border border-[#C7D3E6] hover:border-[#1D4ED8] disabled:opacity-50 rounded-lg cursor-pointer';

  const canCancel = ['pendiente_pago', 'pago_confirmado', 'en_despacho'].includes(order.status);

  return (
    <div className="space-y-3 pt-2 border-t border-[#DCE4F0]">
      {order.status === 'pendiente_pago' && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => onChange(order, 'pago_confirmado')} className={primary}>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Registrar pago recibido
          </button>
          <span className="text-[11px] text-[#475B75]">
            Código {formatPaymentCode(order.paymentCode)} · {PAYMENT_CHANNEL_LABELS[order.paymentChannel]}. Al
            registrarlo, el cliente lo ve de inmediato en su pantalla.
          </span>
        </div>
      )}

      {order.status === 'expirado' && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => onChange(order, 'pago_confirmado')} className={primary}>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Registrar pago tardío y reactivar
          </button>
          <span className="text-[11px] text-[#475B75]">Se vuelve a reservar el stock si hay unidades disponibles.</span>
        </div>
      )}

      {order.status === 'pago_confirmado' && (
        <div className="space-y-2">
          {order.deliveryMethod === 'envio' ? (
            <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_auto] gap-2 items-end">
              <label className="text-[11px] font-semibold text-[#0B2545]">
                Agencia
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs font-normal bg-white border border-[#C7D3E6] rounded-lg"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-[#0B2545]">
                N.° de guía (opcional)
                <input
                  type="text"
                  value={guide}
                  onChange={(e) => setGuide(e.target.value)}
                  placeholder="Ej. SH-20418835"
                  className="mt-1 w-full px-2.5 py-1.5 text-xs font-mono font-normal bg-white border border-[#C7D3E6] rounded-lg"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange(order, 'en_despacho', { shippingCarrier: carrier, trackingGuide: guide })}
                className={primary}
              >
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                Marcar despachado
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => onChange(order, 'en_despacho')} className={primary}>
              <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Marcar listo para recojo
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(order.status === 'pago_confirmado' || order.status === 'en_despacho') && (
          <button type="button" disabled={busy} onClick={() => onChange(order, 'entregado')} className={secondary}>
            <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Marcar entregado
          </button>
        )}
        {canCancel &&
          (confirmCancel ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmCancel(false);
                  onChange(order, 'observado');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Sí, anular y devolver stock
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className={secondary}>
                No
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className={secondary}>
              <XCircle className="w-3.5 h-3.5 text-[#B91C1C]" aria-hidden="true" />
              Anular pedido
            </button>
          ))}
        {(order.status === 'entregado' || order.status === 'observado') && (
          <span className="text-[11px] text-[#475B75]">Pedido cerrado.</span>
        )}
      </div>
    </div>
  );
}
