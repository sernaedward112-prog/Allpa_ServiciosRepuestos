import {
  Banknote,
  CreditCard,
  Landmark,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  DeliveryMethod,
  PaymentChannel,
  Product,
  PublicUserAccount,
  SparePartOrder,
} from '../shared/types';
import { OrderLiveView } from './OrderLiveView';
import type { CartEntry } from './PartsCatalogSection';
import { rememberLastOrder } from './trackingStorage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartEntry[];
  products: Product[];
  currentUser?: PublicUserAccount | null;
  authToken?: string | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOrderCreated: (order: SparePartOrder, updatedProducts: Product[]) => void;
}

const PAYMENT_OPTIONS: {
  id: PaymentChannel;
  title: string;
  hint: string;
  Icon: typeof QrCode;
}[] = [
  { id: 'qr', title: 'Yape / Plin', hint: 'Escanea el QR y paga al instante', Icon: QrCode },
  {
    id: 'transferencia',
    title: 'Transferencia',
    hint: 'BCP, BBVA o Interbank con tu código',
    Icon: Landmark,
  },
  {
    id: 'agente',
    title: 'Agentes y bodegas',
    hint: 'Paga en efectivo con tu código',
    Icon: Banknote,
  },
];

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  products,
  currentUser,
  authToken,
  onUpdateQuantity,
  onRemoveItem,
  onOrderCreated,
}: CartDrawerProps) {
  const initialDocType: 'RUC' | 'DNI' =
    currentUser?.documentType ??
    (currentUser?.rucOrDni?.replace(/\D/g, '').length === 8 ? 'DNI' : 'RUC');

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('presencial');
  const [pickupPoint, setPickupPoint] = useState<string>(
    'Sede Central Ica — Almacén Principal'
  );
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [shippingCarrier, setShippingCarrier] = useState<string>('Shalom');
  const [docType, setDocType] = useState<'RUC' | 'DNI'>(initialDocType);
  const [customerName, setCustomerName] = useState<string>(currentUser?.name ?? '');
  const [companyOrFarm, setCompanyOrFarm] = useState<string>(
    initialDocType === 'RUC' && currentUser?.companyOrFarm !== 'Persona Natural'
      ? (currentUser?.companyOrFarm ?? '')
      : ''
  );
  const [rucOrDni, setRucOrDni] = useState<string>(currentUser?.rucOrDni ?? '');
  const [phone, setPhone] = useState<string>(currentUser?.phone ?? '');
  const [email, setEmail] = useState<string>(currentUser?.email ?? '');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('qr');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<SparePartOrder | null>(null);

  if (!isOpen) return null;

  const detailedItems = cart
    .map((entry) => {
      const product = products.find((p) => p.id === entry.productId);
      return product ? { product, quantity: entry.quantity } : null;
    })
    .filter((item): item is { product: Product; quantity: number } => item !== null);

  const subtotal = detailedItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const shippingFee = detailedItems.length > 0 && deliveryMethod === 'envio' ? 45 : 0;
  const total = subtotal + shippingFee;

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanDoc = rucOrDni.replace(/\D/g, '');
    const expectedLen = docType === 'RUC' ? 11 : 8;
    if (cleanDoc.length !== expectedLen) {
      setErrorMessage(`El ${docType} debe tener exactamente ${expectedLen} dígitos.`);
      return;
    }
    if (docType === 'RUC' && !companyOrFarm.trim()) {
      setErrorMessage('Ingresa el Fundo o Razón Social para tu comprobante con RUC.');
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          companyOrFarm: docType === 'RUC' ? companyOrFarm.trim() : 'Persona Natural',
          rucOrDni: cleanDoc,
          phone,
          email,
          items: detailedItems.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          deliveryMethod,
          deliveryAddress: deliveryMethod === 'presencial' ? pickupPoint : deliveryAddress,
          shippingCarrier,
          paymentChannel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'No se pudo registrar el pedido.');
        return;
      }

      const created = data.order as SparePartOrder;
      rememberLastOrder(created.id, created.phone);
      setConfirmedOrder(created);
      onOrderCreated(created, data.products as Product[]);
    } catch {
      setErrorMessage('Error de red al enviar el pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetReceiptAndClose = () => {
    setConfirmedOrder(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#0B2545]/50 anim-fade"
    >
      <div className="bg-white w-full max-w-xl h-full flex flex-col border-l border-[#DCE4F0] anim-drawer">
        <div className="px-6 py-4 border-b border-[#DCE4F0] flex items-center justify-between bg-[#0B2545] text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
            <h2 id="cart-drawer-title" className="font-display text-lg font-bold">
              {confirmedOrder ? 'Pago de tu pedido' : 'Carrito de repuestos'}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetReceiptAndClose}
            aria-label="Cerrar carrito"
            className="p-1.5 text-[#D4E0F0] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
          {confirmedOrder ? (
            <div className="space-y-5">
              <OrderLiveView
                initialOrder={confirmedOrder}
                phone={confirmedOrder.phone}
                onUpdate={(updated) =>
                  setConfirmedOrder((prev) => (prev ? { ...prev, ...updated } : prev))
                }
              />
              <p className="text-[11px] text-[#475B75] leading-relaxed">
                Guarda tu número de pedido y tu código de pago. Puedes volver a ver el estado cuando
                quieras desde «Seguir pedido», con tu número de pedido y celular.
              </p>
              <button
                type="button"
                onClick={resetReceiptAndClose}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded-lg cursor-pointer"
              >
                Seguir en Allpa
              </button>
            </div>
          ) : detailedItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingCart className="w-10 h-10 text-[#94A3B8] mx-auto" aria-hidden="true" />
              <p className="font-display text-base font-semibold text-[#0B2545]">
                Tu carrito de repuestos está vacío
              </p>
              <p className="text-sm text-[#475B75] max-w-xs mx-auto">
                Agrega repuestos con stock disponible desde el catálogo para coordinar recojo o
                envío.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* Items list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#475B75]">
                  Repuestos seleccionados ({detailedItems.length})
                </p>
                {detailedItems.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 p-3.5 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-[#1D4ED8]">{product.sku}</p>
                      <p className="text-sm font-semibold text-[#0B2545] truncate">
                        {product.name}
                      </p>
                      <p className="text-xs font-mono text-[#475B75] tabular-nums">
                        S/ {product.price.toFixed(2)} c/u · Stock real: {product.stock}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-[#C7D3E6] bg-white rounded-md">
                        <button
                          type="button"
                          aria-label={`Disminuir cantidad de ${product.name}`}
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          className="hit-area p-1.5 text-[#344863] hover:text-[#0B2545] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-mono font-semibold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          disabled={quantity >= product.stock}
                          aria-label={`Aumentar cantidad de ${product.name}`}
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          className="hit-area p-1.5 text-[#344863] hover:text-[#0B2545] disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Eliminar ${product.name}`}
                        onClick={() => onRemoveItem(product.id)}
                        className="hit-area p-1.5 text-[#475B75] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Mode */}
              <div className="space-y-3 pt-4 border-t border-[#DCE4F0]">
                <p className="text-xs font-semibold text-[#0B2545]">
                  Paso 1 · ¿Cómo deseas recibir tus repuestos?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('presencial')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      deliveryMethod === 'presencial'
                        ? 'bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                        : 'bg-white border-[#DCE4F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2545]">
                        <MapPin className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                        Recojo en punto
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#1D4ED8]">Gratis</span>
                    </div>
                    <p className="text-xs text-[#475B75]">
                      Retira sin costo en Sede Central Ica o punto de entrega coordinado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('envio')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      deliveryMethod === 'envio'
                        ? 'bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                        : 'bg-white border-[#DCE4F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2545]">
                        <Truck className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                        Envío nacional
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#0B2545] tabular-nums">
                        S/ 45.00
                      </span>
                    </div>
                    <p className="text-xs text-[#475B75]">
                      Despacho a tu fundo o agencia (Shalom / Marvisur / Olva).
                    </p>
                  </button>
                </div>

                {deliveryMethod === 'presencial' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                      Punto de recojo *
                    </label>
                    <select
                      value={pickupPoint}
                      onChange={(e) => setPickupPoint(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg bg-white"
                    >
                      <option value="Sede Central Ica — Almacén Principal">
                        Sede Central Ica — Almacén Principal (entrega el mismo día)
                      </option>
                      <option value="Punto de Entrega Pisco / Chincha (coordinado)">
                        Punto de Entrega Pisco / Chincha (coordinado)
                      </option>
                      <option value="Punto de Entrega Lima Sur (coordinado)">
                        Punto de Entrega Lima Sur (coordinado)
                      </option>
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                        Agencia / Reparto
                      </label>
                      <select
                        value={shippingCarrier}
                        onChange={(e) => setShippingCarrier(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg bg-white"
                      >
                        <option value="Shalom">Shalom</option>
                        <option value="Marvisur">Marvisur</option>
                        <option value="Olva Courier">Olva Courier</option>
                        <option value="Reparto Directo Allpa">Reparto Directo Fundo</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                        Dirección de entrega o agencia destino *
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Ej. Fundo San José Km 285 Ica / Agencia Shalom Trujillo"
                        className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Deposit Confirmation */}
              <div className="space-y-3 pt-4 border-t border-[#DCE4F0]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                  <p className="text-xs font-semibold text-[#0B2545]">
                    Paso 2 · Tus datos
                  </p>
                </div>

                {/* RUC vs DNI Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDocType('RUC');
                      if (rucOrDni.replace(/\D/g, '').length === 8) setRucOrDni('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                      docType === 'RUC'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                    }`}
                  >
                    RUC · Empresa / Fundo (11 díg.)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocType('DNI');
                      setCompanyOrFarm('');
                      if (rucOrDni.replace(/\D/g, '').length === 11) setRucOrDni('');
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                      docType === 'DNI'
                        ? 'bg-[#0B2545] text-white border-[#0B2545]'
                        : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                    }`}
                  >
                    DNI · Persona Natural (8 díg.)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={docType === 'RUC' ? 11 : 8}
                    value={rucOrDni}
                    onChange={(e) => setRucOrDni(e.target.value.replace(/\D/g, ''))}
                    placeholder={
                      docType === 'RUC'
                        ? 'Número de RUC (11 dígitos) *'
                        : 'Número de DNI (8 dígitos) *'
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-[#C7D3E6] rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={
                      docType === 'RUC'
                        ? 'Nombre del contacto *'
                        : 'Nombre completo (Persona Natural) *'
                    }
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg"
                  />
                  {docType === 'RUC' && (
                    <input
                      type="text"
                      required
                      value={companyOrFarm}
                      onChange={(e) => setCompanyOrFarm(e.target.value)}
                      placeholder="Fundo o Razón Social *"
                      className="w-full sm:col-span-2 px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg"
                    />
                  )}
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="WhatsApp de confirmación *"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo obligatorio (comprobante) *"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg"
                  />
                </div>

              </div>

              {/* Payment method */}
              <div className="space-y-3 pt-4 border-t border-[#DCE4F0]">
                <p className="text-xs font-semibold text-[#0B2545]">Paso 3 · ¿Cómo quieres pagar?</p>
                <div
                  role="radiogroup"
                  aria-label="Forma de pago"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                >
                  {PAYMENT_OPTIONS.map(({ id, title, hint, Icon }) => {
                    const selected = paymentChannel === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPaymentChannel(id)}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#EFF6FF] border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                            : 'bg-white border-[#DCE4F0] hover:border-[#93B4E8]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2545]">
                          <Icon className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
                          {title}
                        </span>
                        <span className="block text-[11px] text-[#475B75] mt-1 leading-snug">
                          {hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#475B75] leading-relaxed">
                  Al continuar generamos tu código de pago. No necesitas enviar números de operación ni
                  comprobantes: confirmamos tu pago automáticamente y verás el avance aquí mismo.
                </p>
              </div>

              {/* Totals & Submit */}
              <div className="pt-4 border-t border-[#DCE4F0] space-y-3">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#475B75]">
                    <dt>Subtotal repuestos</dt>
                    <dd className="font-mono tabular-nums">S/ {subtotal.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-[#475B75]">
                    <dt>
                      Costo de entrega ({deliveryMethod === 'presencial' ? 'Presencial' : 'Envío'})
                    </dt>
                    <dd className="font-mono tabular-nums">S/ {shippingFee.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[#0B2545] pt-1">
                    <dt>Total a pagar</dt>
                    <dd className="font-mono tabular-nums text-[#EA580C]">S/ {total.toFixed(2)}</dd>
                  </div>
                </dl>

                {errorMessage && (
                  <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? 'Generando código de pago...' : 'Generar código de pago'}
                </button>

                <p className="flex items-center gap-1.5 text-[11px] text-[#475B75]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                  <span>Información tratada conforme a la Ley N.° 29733.</span>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
