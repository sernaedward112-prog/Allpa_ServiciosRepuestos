import {
  CheckCircle2,
  Clock,
  Copy,
  Landmark,
  MessageCircle,
  QrCode,
  Store,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import {
  PAYMENT_CHANNEL_LABELS,
  formatPaymentCode,
  orderStatusLabel,
  type OrderStatus,
} from '../shared/types';
import { BANK_ACCOUNTS, COMPANY_NAME, WALLET_NUMBER, WHATSAPP_NUMBER } from '../shared/paymentInfo';
import { OrderTracker, type TrackableOrder } from './OrderTracker';

interface OrderLiveViewProps {
  initialOrder: TrackableOrder;
  /** Celular con el que se registró el pedido; sirve para consultar el estado en vivo. */
  phone: string;
  onUpdate?: (order: TrackableOrder) => void;
}

const FINAL_STATUSES: OrderStatus[] = ['entregado', 'observado'];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pendiente_pago: 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]',
  pago_confirmado: 'bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]',
  en_despacho: 'bg-[#E0F2FE] text-[#075985] border-[#7DD3FC]',
  entregado: 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]',
  observado: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
  expirado: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
};

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderLiveView({ initialOrder, phone, onUpdate }: OrderLiveViewProps) {
  const [order, setOrder] = useState<TrackableOrder>(initialOrder);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState<boolean>(false);
  const [justPaid, setJustPaid] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<number>(() => Date.now());
  const statusRef = useRef<OrderStatus>(initialOrder.status);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    setOrder(initialOrder);
    statusRef.current = initialOrder.status;
  }, [initialOrder.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Código QR con la referencia del pago (código + monto).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`ALLPA|PAGO|${order.paymentCode}|${order.total.toFixed(2)}`, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B2545', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [order.paymentCode, order.total]);

  // Cuenta regresiva del vencimiento.
  useEffect(() => {
    if (order.status !== 'pendiente_pago') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order.status]);

  // Consulta el estado en vivo mientras el pedido siga avanzando.
  useEffect(() => {
    if (FINAL_STATUSES.includes(order.status)) return;
    let stopped = false;
    const intervalMs = order.status === 'pendiente_pago' ? 4000 : 10000;

    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(
          `/api/orders/track?ref=${encodeURIComponent(order.id)}&phone=${encodeURIComponent(phone)}`
        );
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { order: TrackableOrder };
        if (stopped) return;
        setLastCheck(Date.now());
        if (data.order.status !== statusRef.current) {
          if (statusRef.current === 'pendiente_pago' && data.order.status === 'pago_confirmado') {
            setJustPaid(true);
          }
          statusRef.current = data.order.status;
          setOrder(data.order);
          onUpdateRef.current?.(data.order);
        } else if (
          data.order.events.length !== order.events.length ||
          data.order.trackingGuide !== order.trackingGuide
        ) {
          setOrder(data.order);
          onUpdateRef.current?.(data.order);
        }
      } catch {
        /* sin red: se vuelve a intentar en el siguiente ciclo */
      }
    };

    const timer = window.setInterval(check, intervalMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [order.id, order.status, order.events.length, order.trackingGuide, phone]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order.paymentCode);
    } catch {
      const area = document.createElement('textarea');
      area.value = order.paymentCode;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
      } catch {
        /* sin portapapeles */
      }
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const pending = order.status === 'pendiente_pago';
  const remaining = new Date(order.paymentDeadline).getTime() - now;
  const urgent = pending && remaining < 60 * 60 * 1000;
  const waText = encodeURIComponent(
    `Hola Allpa, consulto por mi pedido ${order.id} (código de pago ${formatPaymentCode(order.paymentCode)}).`
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#475B75]">Pedido</p>
          <p className="font-mono text-lg font-bold text-[#0B2545]">{order.id}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_STYLES[order.status]}`}
        >
          {pending && <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" aria-hidden="true" />}
          {orderStatusLabel(order.status, order.deliveryMethod)}
        </span>
      </div>

      {justPaid && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D]"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-display font-bold">¡Recibimos tu pago!</p>
            <p className="text-xs mt-0.5">
              Operación <span className="font-mono font-semibold">{order.operationNumber}</span>. Ahora
              preparamos tu pedido; aquí verás cada avance.
            </p>
          </div>
        </div>
      )}

      {pending ? (
        <section
          aria-label="Código de pago"
          className="rounded-xl border border-[#DCE4F0] overflow-hidden bg-white"
        >
          <div className="p-5 bg-[#F4F7FB] border-b border-[#DCE4F0] text-center space-y-1">
            <p className="text-xs font-semibold text-[#475B75]">Tu código de pago</p>
            <p className="font-mono text-3xl font-bold tracking-wider text-[#0B2545] tabular-nums">
              {formatPaymentCode(order.paymentCode)}
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="hit-area inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] bg-white border border-[#BFDBFE] rounded-lg hover:bg-[#EFF6FF] cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {copied ? 'Código copiado' : 'Copiar código'}
            </button>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-[#DCE4F0] border-b border-[#DCE4F0] text-center">
            <div className="p-3">
              <dt className="text-[11px] text-[#475B75]">Monto a pagar</dt>
              <dd className="font-mono text-xl font-bold text-[#EA580C] tabular-nums">
                S/ {order.total.toFixed(2)}
              </dd>
            </div>
            <div className="p-3">
              <dt className="text-[11px] text-[#475B75]">Vence en</dt>
              <dd
                className={`font-mono text-xl font-bold tabular-nums ${urgent ? 'text-[#B91C1C]' : 'text-[#0B2545]'}`}
              >
                {formatCountdown(remaining)}
              </dd>
              <p className="text-[10px] text-[#475B75]">{formatDeadline(order.paymentDeadline)}</p>
            </div>
          </dl>

          <div className="p-5 space-y-4">
            <p className="text-xs font-semibold text-[#0B2545]">
              Forma de pago: {PAYMENT_CHANNEL_LABELS[order.paymentChannel]}
            </p>

            {order.paymentChannel === 'qr' && (
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="shrink-0 p-2 bg-white border border-[#DCE4F0] rounded-xl">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`Código QR del pago ${formatPaymentCode(order.paymentCode)}`}
                      width={176}
                      height={176}
                      className="w-44 h-44"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-[#94A3B8]">
                      <QrCode className="w-10 h-10" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <ol className="space-y-2 text-xs text-[#344863] list-decimal pl-4">
                  <li>Abre Yape o Plin en tu celular.</li>
                  <li>Escanea el código QR de esta pantalla.</li>
                  <li>
                    Verifica el monto de{' '}
                    <strong className="tabular-nums">S/ {order.total.toFixed(2)}</strong> y confirma.
                  </li>
                  <li>Esta pantalla se actualizará sola cuando recibamos tu pago.</li>
                </ol>
              </div>
            )}

            {order.paymentChannel === 'transferencia' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#344863]">
                  <Landmark className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                  <span>
                    Transfiere <strong className="tabular-nums">S/ {order.total.toFixed(2)}</strong> a
                    nombre de <strong>{COMPANY_NAME}</strong> y escribe tu código de pago como
                    referencia.
                  </span>
                </div>
                <ul className="bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg p-3 space-y-1.5 text-xs">
                  {BANK_ACCOUNTS.map((acc) => (
                    <li key={acc.bank} className="flex flex-wrap justify-between gap-1">
                      <span className="font-semibold text-[#0B2545]">{acc.bank}</span>
                      <span className="font-mono text-[#344863]">
                        {acc.account}
                        {acc.cci ? ` · CCI ${acc.cci}` : ''}
                      </span>
                    </li>
                  ))}
                  <li className="flex flex-wrap justify-between gap-1">
                    <span className="font-semibold text-[#0B2545]">Yape / Plin</span>
                    <span className="font-mono text-[#344863]">{WALLET_NUMBER}</span>
                  </li>
                </ul>
              </div>
            )}

            {order.paymentChannel === 'agente' && (
              <div className="space-y-2 text-xs text-[#344863]">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                  <span className="font-semibold text-[#0B2545]">Paga en efectivo cerca de ti</span>
                </div>
                <ol className="space-y-1.5 list-decimal pl-5">
                  <li>Acércate a un agente o bodega con servicio de pago de servicios.</li>
                  <li>
                    Indica la empresa <strong>Servicios y Repuestos Allpa</strong> y entrega tu código de
                    pago.
                  </li>
                  <li>
                    Paga <strong className="tabular-nums">S/ {order.total.toFixed(2)}</strong> y guarda tu
                    constancia.
                  </li>
                </ol>
              </div>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-[#DCE4F0] text-[11px] text-[#475B75]">
              <Clock className="w-3.5 h-3.5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
              <span>
                Esperando tu pago · actualizado a las{' '}
                {new Date(lastCheck).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
                {' '}(se actualiza solo)
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-label="Seguimiento del pedido" className="space-y-3">
        <h3 className="font-display text-sm font-bold text-[#0B2545]">Seguimiento de tu pedido</h3>
        <OrderTracker order={order} />
      </section>

      <section aria-label="Detalle del pedido" className="rounded-lg border border-[#DCE4F0] p-4 space-y-2">
        <h3 className="font-display text-sm font-bold text-[#0B2545]">Detalle</h3>
        <ul className="space-y-1 text-xs text-[#344863]">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="font-mono tabular-nums shrink-0">
                S/ {(item.quantity * item.unitPrice).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="pt-2 border-t border-[#DCE4F0] text-xs space-y-1">
          <div className="flex justify-between text-[#475B75]">
            <dt>
              {order.deliveryMethod === 'envio' ? `Envío (${order.shippingCarrier})` : 'Recojo en punto'}
            </dt>
            <dd className="font-mono tabular-nums">S/ {order.shippingFee.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between font-bold text-[#0B2545] text-sm">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">S/ {order.total.toFixed(2)}</dd>
          </div>
          <div className="text-[#475B75]">{order.deliveryAddress}</div>
        </dl>
      </section>

      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
        target="_blank"
        rel="noreferrer"
        className="hit-area inline-flex items-center gap-2 text-xs font-semibold text-[#1D4ED8] hover:underline"
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        ¿Dudas con tu pedido? Escríbenos por WhatsApp
      </a>
    </div>
  );
}
