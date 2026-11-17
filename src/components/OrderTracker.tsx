import { AlertTriangle, Check, Package, Truck } from 'lucide-react';
import type { PublicOrderTracking } from '../shared/types';

export type TrackableOrder = Omit<PublicOrderTracking, 'customerFirstName'>;

interface StepDef {
  key: string;
  label: string;
  at?: string;
  done: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSteps(order: TrackableOrder): StepDef[] {
  const paid = Boolean(order.paidAt);
  const dispatched = Boolean(order.dispatchedAt) || order.status === 'entregado';
  const delivered = order.status === 'entregado';
  return [
    { key: 'recibido', label: 'Pedido recibido', at: order.createdAt, done: true },
    { key: 'pago', label: 'Pago confirmado', at: order.paidAt, done: paid },
    {
      key: 'despacho',
      label: order.deliveryMethod === 'envio' ? 'Despachado' : 'Listo para recojo',
      at: order.dispatchedAt,
      done: dispatched,
    },
    { key: 'entrega', label: 'Entregado', at: order.deliveredAt, done: delivered },
  ];
}

export function OrderTracker({ order }: { order: TrackableOrder }) {
  const steps = buildSteps(order);
  const closed = order.status === 'observado' || order.status === 'expirado';
  const currentIndex = closed ? -1 : steps.findIndex((s) => !s.done);

  return (
    <div className="space-y-4">
      {closed && (
        <div
          role="status"
          className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            {order.status === 'expirado'
              ? 'El código de pago venció y el stock reservado fue liberado. Si ya realizaste el pago, escríbenos por WhatsApp con tu código para reactivar el pedido.'
              : 'Este pedido fue anulado. Si tienes dudas, escríbenos por WhatsApp indicando tu número de pedido.'}
          </p>
        </div>
      )}

      <ol aria-label="Avance del pedido" className="grid grid-cols-4 gap-1">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const circle = step.done
            ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
            : isCurrent
              ? 'bg-white border-[#EA580C] text-[#EA580C] ring-4 ring-[#FED7AA]'
              : 'bg-white border-[#C7D3E6] text-[#94A3B8]';
          const Icon = step.key === 'despacho' && order.deliveryMethod === 'envio' ? Truck : Package;
          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex flex-col items-center text-center gap-1.5 relative"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${
                    step.done ? 'bg-[#1D4ED8]' : 'bg-[#DCE4F0]'
                  }`}
                />
              )}
              <span
                className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center ${circle}`}
              >
                {step.done ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </span>
              <span
                className={`text-[11px] leading-tight font-semibold ${
                  step.done || isCurrent ? 'text-[#0B2545]' : 'text-[#7C8CA3]'
                }`}
              >
                {step.label}
              </span>
              {step.at && step.done && (
                <time dateTime={step.at} className="text-[10px] text-[#475B75] tabular-nums">
                  {formatDateTime(step.at)}
                </time>
              )}
            </li>
          );
        })}
      </ol>

      {order.deliveryMethod === 'envio' && order.trackingGuide && (
        <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#0B2545] flex flex-wrap items-center justify-between gap-2">
          <span>
            Agencia: <strong>{order.shippingCarrier}</strong>
          </span>
          <span>
            N.° de guía: <strong className="font-mono">{order.trackingGuide}</strong>
          </span>
          <span className="w-full text-[#475B75]">Destino: {order.deliveryAddress}</span>
        </div>
      )}

      {order.events.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#0B2545] mb-2">Historial del pedido</h4>
          <ul className="space-y-2 border-l-2 border-[#DCE4F0] pl-3">
            {[...order.events].reverse().map((event, i) => (
              <li key={`${event.at}-${i}`} className="text-xs text-[#344863]">
                <span className="font-semibold text-[#0B2545]">{event.title}</span>
                <time dateTime={event.at} className="ml-2 text-[#475B75] tabular-nums">
                  {formatDateTime(event.at)}
                </time>
                {event.detail && <p className="text-[#475B75] mt-0.5">{event.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
