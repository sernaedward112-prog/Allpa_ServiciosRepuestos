import {
  ClipboardList,
  LogOut,
  Package,
  RefreshCw,
  ShoppingBag,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  SERVICE_BASE_TARIFFS,
  type InternalPartRequest,
  type PublicUserAccount,
  type ServiceQuote,
  type SparePartOrder,
} from '../shared/types';
import { orderStatusLabel } from '../shared/types';
import type { ActivePage } from './Header';
import { OrderLiveView } from './OrderLiveView';

interface ClientPortalSectionProps {
  currentUser: PublicUserAccount | null;
  authToken: string | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onNavigate: (page: ActivePage) => void;
}

const QUOTE_STATUS_LABELS: Record<ServiceQuote['status'], string> = {
  recibida: 'Recibida en Operaciones',
  operador_asignado: 'Técnico / Operador asignado',
  en_ruta: 'Unidad móvil en ruta',
  completado: 'Servicio completado',
};

const INTERNAL_STATUS_LABELS: Record<InternalPartRequest['status'], string> = {
  pendiente_logistica: 'Pendiente de revisión',
  cotizando_proveedor: 'Cotizando con proveedor',
  en_transito_almacen: 'En tránsito a almacén',
  disponible_en_stock: 'Disponible en stock',
};

export function ClientPortalSection({
  currentUser,
  authToken,
  onOpenAuth,
  onLogout,
  onNavigate,
}: ClientPortalSectionProps) {
  const [orders, setOrders] = useState<SparePartOrder[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<ServiceQuote[]>([]);
  const [internalRequests, setInternalRequests] = useState<InternalPartRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/client/activity', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo cargar tu historial.');
        return;
      }
      setOrders(data.orders ?? []);
      setQuotes(data.serviceQuotes ?? []);
      setInternalRequests(data.internalRequests ?? []);
    } catch {
      setErrorMsg('Error de conexión al consultar tu cuenta.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (currentUser && authToken) {
      loadActivity();
    }
  }, [currentUser, authToken, loadActivity]);

  if (!currentUser) {
    return (
      <section className="py-16 bg-[#F4F7FB] min-h-[75vh]">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 sm:p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6 text-[#1D4ED8]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#EA580C]">
                Identificación con RUC o DNI · Plataforma Allpa
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545]">
                Consulta tus pedidos y servicios
              </h1>
              <p className="text-sm text-[#344863] leading-relaxed">
                Inicia sesión con tu número de RUC (11 dígitos) o DNI (8 dígitos), o crea tu cuenta
                de cliente con correo electrónico obligatorio para recibir tus comprobantes y
                confirmaciones de compra.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-[#DCE4F0]">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded-lg cursor-pointer whitespace-nowrap"
              >
                Iniciar sesión (RUC / DNI)
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer whitespace-nowrap"
              >
                Registrarme como cliente
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-16 bg-[#F4F7FB] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Clean Account Profile Banner */}
        <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-[#1D4ED8]">MI PORTAL</span>
              <span aria-hidden="true" className="text-[#94A3B8]">·</span>
              <span className="font-mono text-[#EA580C]">
                {currentUser.rucOrDni ? `Doc. ${currentUser.rucOrDni}` : 'Cuenta Verificada'}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545]">
              Hola, {currentUser.name}
            </h1>
            <p className="text-sm text-[#344863]">
              {currentUser.documentType === 'DNI' || currentUser.companyOrFarm === 'Persona Natural'
                ? 'Persona Natural'
                : currentUser.companyOrFarm}{' '}
              · Tel: <span className="font-mono">{currentUser.phone}</span> · {currentUser.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('repuestos')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded-lg cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
              <span>Ir a Repuestos</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('servicios')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
            >
              <Wrench className="w-4 h-4" aria-hidden="true" />
              <span>Cotizar Servicio</span>
            </button>
            <button
              type="button"
              onClick={loadActivity}
              aria-label="Actualizar historial"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#344863] bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] px-4 py-3 rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* Summary Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#475B75]">Mis Pedidos de Repuestos</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums mt-1">
                {orders.length}
              </p>
            </div>
            <ShoppingBag className="w-6 h-6 text-[#EA580C]" aria-hidden="true" />
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#475B75]">Mis Cotizaciones Técnicas</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums mt-1">
                {quotes.length}
              </p>
            </div>
            <Wrench className="w-6 h-6 text-[#1D4ED8]" aria-hidden="true" />
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#475B75]">Solicitudes Internas</p>
              <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums mt-1">
                {internalRequests.length}
              </p>
            </div>
            <ClipboardList className="w-6 h-6 text-[#F59E0B]" aria-hidden="true" />
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545]">
            Seguimiento de mis pedidos
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-[#475B75]">
              Aún no tienes pedidos registrados con esta cuenta.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B2545]">{order.id}</span>
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        {orderStatusLabel(order.status, order.deliveryMethod)}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#EA580C] tabular-nums">
                      S/ {order.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[#344863]">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ')}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#475B75] pt-1 border-t border-[#DCE4F0]">
                    <span>
                      Entrega: {order.deliveryMethod === 'presencial' ? 'Presencial' : order.shippingCarrier} ·{' '}
                      {order.deliveryAddress}
                    </span>
                    <button
                      type="button"
                      aria-expanded={openOrderId === order.id}
                      onClick={() => setOpenOrderId(openOrderId === order.id ? null : order.id)}
                      className="hit-area font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      {openOrderId === order.id
                        ? 'Ocultar seguimiento'
                        : order.status === 'pendiente_pago'
                          ? 'Ver código de pago'
                          : 'Ver seguimiento'}
                    </button>
                  </div>
                  {openOrderId === order.id && (
                    <div className="pt-3 border-t border-[#DCE4F0]">
                      <OrderLiveView
                        key={order.id}
                        initialOrder={order}
                        phone={order.phone}
                        onUpdate={(updated) =>
                          setOrders((prev) =>
                            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service Quotes List */}
        <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545]">
            Mis Cotizaciones de Servicio Técnico y Alquiler
          </h2>
          {quotes.length === 0 ? (
            <p className="text-sm text-[#475B75]">
              Aún no has enviado cotizaciones de mantenimiento o alquiler desde esta cuenta.
            </p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#1D4ED8] mr-2">
                        {q.id}
                      </span>
                      <span className="text-sm font-bold text-[#0B2545]">
                        {SERVICE_BASE_TARIFFS[q.serviceType].label} — {q.machineBrandModel}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#EA580C] tabular-nums">
                      S/ {(q.finalAgreedPrice ?? q.breakdown.total).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[#344863]">
                    {q.regionName} ({q.distanceKm} km) · Fecha solicitada: {q.preferredDate} ·{' '}
                    Estado: <strong>{QUOTE_STATUS_LABELS[q.status]}</strong>
                  </p>
                  <p className="text-xs text-[#475B75]">
                    Técnico / Operador: <strong className="text-[#0B2545]">{q.assignedOperator}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Internal Part Requests */}
        {internalRequests.length > 0 && (
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B2545]">
              Mis Solicitudes de Repuestos al Interno
            </h2>
            <div className="space-y-3">
              {internalRequests.map((reqItem) => (
                <div
                  key={reqItem.id}
                  className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[#0B2545]">
                      {reqItem.partName}{' '}
                      <span className="font-mono text-xs text-[#1D4ED8]">
                        ({reqItem.quantityNeeded} und.)
                      </span>
                    </p>
                    <p className="text-xs text-[#475B75]">
                      Código {reqItem.id} · Estado: {INTERNAL_STATUS_LABELS[reqItem.status]} ·{' '}
                      Llegada est.: {reqItem.estimatedArrival}
                    </p>
                  </div>
                  {reqItem.quotedUnitPrice && (
                    <span className="font-mono text-sm font-bold text-[#EA580C]">
                      Cotizado: S/ {reqItem.quotedUnitPrice.toFixed(2)} c/u
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
