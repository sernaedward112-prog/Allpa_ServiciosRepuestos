import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Mail,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AdminOrderActions } from './AdminOrderActions';
import {
  PAYMENT_CHANNEL_LABELS,
  SERVICE_BASE_TARIFFS,
  formatPaymentCode,
  type AllpaDatabase,
  type DistanceZoneTariff,
  type InternalPartRequest,
  type InternalRequestStatus,
  type OrderStatus,
  type Product,
  type ProductCategory,
  type PublicUserAccount,
  type ServiceQuote,
  type ServiceQuoteStatus,
  type ServiceType,
  type SparePartOrder,
} from '../shared/types';

interface AdminSectionProps {
  db: AllpaDatabase;
  currentUser: PublicUserAccount | null;
  authToken: string | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onRefreshAdminDb: () => Promise<void>;
  onDatabaseUpdate: (updater: (prev: AllpaDatabase) => AllpaDatabase) => void;
  onSwitchToClientView: () => void;
}

type AdminTab = 'stock' | 'sales' | 'services' | 'requests' | 'inquiries';

const CATEGORIES: ProductCategory[] = [
  'Hidráulica',
  'Inyección',
  'Filtración',
  'Motor y Transmisión',
  'Frenos y Embrague',
  'Refrigeración',
  'Eléctrico',
  'Implementos Agrícolas',
  'Lubricantes y Sellos',
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  pago_confirmado: 'Pago confirmado',
  en_despacho: 'Despachado / listo para recojo',
  entregado: 'Entregado',
  observado: 'Anulado (stock devuelto)',
  expirado: 'Código vencido (stock devuelto)',
};

const QUOTE_STATUS_LABELS: Record<ServiceQuoteStatus, string> = {
  recibida: 'Recibida',
  operador_asignado: 'Operador asignado',
  en_ruta: 'En ruta',
  completado: 'Completado',
};

export function AdminSection({
  db,
  currentUser,
  authToken,
  onOpenAuth,
  onLogout,
  onRefreshAdminDb,
  onDatabaseUpdate,
  onSwitchToClientView,
}: AdminSectionProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('stock');
  const [stockSearch, setStockSearch] = useState<string>('');
  const [stockCategory, setStockCategory] = useState<string>('Todas');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Borradores de stock, precio y ubicación por producto
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});

  // Borradores de tarifas y cotizaciones (se guardan con el botón)
  const [tariffDrafts, setTariffDrafts] = useState<
    Record<string, { perKmRate?: number; operatorViaticos?: number; tollsCost?: number }>
  >({});
  const [quoteDrafts, setQuoteDrafts] = useState<
    Record<string, { assignedOperator?: string; finalAgreedPrice?: number }>
  >({});

  // Sales & Services Filters
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'all' | ServiceQuoteStatus>('all');

  // Add Product Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newSku, setNewSku] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Filtración');
  const [newModels, setNewModels] = useState<string>('');
  const [newPrice, setNewPrice] = useState<number>(120);
  const [newStock, setNewStock] = useState<number>(5);
  const [newLocation, setNewLocation] = useState<string>('Almacén Principal Ica · Rack A-01');

  if (!currentUser || currentUser.role !== 'administracion') {
    return (
      <section className="py-16 bg-[#F4F7FB] min-h-[75vh]">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 sm:p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-[#EA580C]" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-[#0B2545]">
                Acceso restringido
              </h1>
              <p className="text-sm text-[#344863] leading-relaxed">
                {currentUser
                  ? 'Tu cuenta actual no tiene permisos para este módulo. Puedes volver al catálogo de repuestos o iniciar sesión con una credencial autorizada.'
                  : 'Ingresa con tu RUC o DNI autorizado desde Iniciar sesión, o explora nuestro catálogo de repuestos y servicios.'}
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
                onClick={onSwitchToClientView}
                className="px-5 py-2.5 text-sm font-medium text-[#344863] bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg cursor-pointer whitespace-nowrap"
              >
                Volver al catálogo
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Inventory metrics
  const lowStockProducts = db.products.filter((p) => p.stock > 0 && p.stock < 3);
  const outOfStockProducts = db.products.filter((p) => p.stock === 0);
  const totalInventoryUnits = db.products.reduce((sum, p) => sum + p.stock, 0);
  const totalInventoryValue = db.products.reduce((sum, p) => sum + p.stock * p.price, 0);

  // Sales Dashboard Metrics
  const validOrders = db.orders.filter((o) => o.status !== 'observado' && o.status !== 'expirado');
  const totalSalesRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const confirmedSalesRevenue = validOrders
    .filter(
      (o) =>
        o.status === 'pago_confirmado' ||
        o.status === 'en_despacho' ||
        o.status === 'entregado'
    )
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = db.orders.filter((o) => o.status === 'pendiente_pago');
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);
  const totalUnitsSold = validOrders.reduce(
    (sum, o) => sum + o.items.reduce((acc, it) => acc + it.quantity, 0),
    0
  );
  const averageOrderTicket = validOrders.length > 0 ? totalSalesRevenue / validOrders.length : 0;

  const productById = new Map<string, Product>(db.products.map((p) => [p.id, p]));

  const salesByCategoryMap = new Map<string, { revenue: number; units: number }>();
  const topPartsMap = new Map<
    string,
    { sku: string; name: string; category: string; units: number; revenue: number }
  >();

  for (const order of validOrders) {
    for (const item of order.items) {
      const prod = productById.get(item.productId);
      const cat = prod?.category ?? 'Otros';
      const lineTotal = item.quantity * item.unitPrice;
      const prevCat = salesByCategoryMap.get(cat) ?? { revenue: 0, units: 0 };
      salesByCategoryMap.set(cat, {
        revenue: prevCat.revenue + lineTotal,
        units: prevCat.units + item.quantity,
      });

      const prevPart = topPartsMap.get(item.productId) ?? {
        sku: item.sku,
        name: item.name,
        category: cat,
        units: 0,
        revenue: 0,
      };
      topPartsMap.set(item.productId, {
        ...prevPart,
        units: prevPart.units + item.quantity,
        revenue: prevPart.revenue + lineTotal,
      });
    }
  }

  const salesByCategory = Array.from(salesByCategoryMap.entries())
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxCategoryRevenue = Math.max(1, ...salesByCategory.map((c) => c.revenue));

  const topSoldParts = Array.from(topPartsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const paymentChannelsSummary = (['qr', 'transferencia', 'agente'] as const).map((channel) => {
    const matching = validOrders.filter((o) => o.paymentChannel === channel && o.paidAt);
    return {
      channel,
      label: PAYMENT_CHANNEL_LABELS[channel],
      count: matching.length,
      amount: matching.reduce((s, o) => s + o.total, 0),
    };
  });

  const envioOrdersCount = validOrders.filter((o) => o.deliveryMethod === 'envio').length;
  const presencialOrdersCount = validOrders.filter((o) => o.deliveryMethod === 'presencial').length;

  // Services Dashboard Metrics
  const getQuoteAmount = (q: ServiceQuote) => q.finalAgreedPrice ?? q.breakdown.total;
  const totalServicesQuoted = db.serviceQuotes.reduce((sum, q) => sum + getQuoteAmount(q), 0);
  const completedServicesCount = db.serviceQuotes.filter((q) => q.status === 'completado').length;
  const activeServicesCount = db.serviceQuotes.filter((q) => q.status !== 'completado').length;
  const emergencyServicesCount = db.serviceQuotes.filter(
    (q) => q.urgency === 'emergencia_24h'
  ).length;
  const avgServiceDistance =
    db.serviceQuotes.length > 0
      ? Math.round(
          db.serviceQuotes.reduce((sum, q) => sum + q.distanceKm, 0) / db.serviceQuotes.length
        )
      : 0;
  const totalViaticosAndTolls = db.serviceQuotes.reduce(
    (sum, q) => sum + q.breakdown.operatorViaticos + (q.breakdown.tollsCost ?? 0),
    0
  );

  const servicesByZone = db.zoneTariffs.map((zone) => {
    const quotes = db.serviceQuotes.filter((q) => q.zoneId === zone.id);
    return {
      id: zone.id,
      name: zone.name,
      count: quotes.length,
      revenue: quotes.reduce((sum, q) => sum + getQuoteAmount(q), 0),
    };
  });
  const maxZoneRevenue = Math.max(1, ...servicesByZone.map((z) => z.revenue));

  const servicesByType = (Object.keys(SERVICE_BASE_TARIFFS) as ServiceType[]).map((type) => {
    const quotes = db.serviceQuotes.filter((q) => q.serviceType === type);
    return {
      type,
      label: SERVICE_BASE_TARIFFS[type].label,
      count: quotes.length,
      revenue: quotes.reduce((sum, q) => sum + getQuoteAmount(q), 0),
    };
  });
  const maxServiceTypeRevenue = Math.max(1, ...servicesByType.map((t) => t.revenue));

  const filteredStock = db.products.filter((p) => {
    if (onlyCritical && p.stock >= 3) return false;
    if (stockCategory !== 'Todas' && p.category !== stockCategory) return false;
    const q = stockSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const filteredOrders = db.orders.filter(
    (o) => orderFilter === 'all' || o.status === orderFilter
  );

  const filteredServiceQuotes = db.serviceQuotes.filter((q) => {
    if (serviceStatusFilter !== 'all' && q.status !== serviceStatusFilter) {
      return false;
    }
    return true;
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken || ''}`,
  };

  const notify = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 4000);
  };

  const handleUpdateProduct = async (
    product: Product,
    updates: { stock?: number; price?: number; warehouseLocation?: string }
  ) => {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as Product;
      onDatabaseUpdate((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
      }));
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setLocationDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      notify(
        `Inventario actualizado: ${updated.sku} · Stock ${updated.stock} und. · S/ ${updated.price.toFixed(2)}`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setBusyId('new-product');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sku: newSku,
          name: newName,
          category: newCategory,
          compatibleModels: newModels || 'Multimarca Agrícola',
          price: newPrice,
          stock: newStock,
          minStock: 3,
          warehouseLocation: newLocation,
        }),
      });
      if (!res.ok) return;
      const created = (await res.json()) as Product;
      onDatabaseUpdate((prev) => ({
        ...prev,
        products: [created, ...prev.products],
      }));
      setShowAddForm(false);
      setNewSku('');
      setNewName('');
      setNewModels('');
      notify(`Nuevo repuesto agregado: ${created.sku}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateOrder = async (
    order: SparePartOrder,
    status: OrderStatus,
    extra?: { trackingGuide?: string; shippingCarrier?: string }
  ) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        notify(err.error || 'No se pudo actualizar el pedido.');
        return;
      }
      const data = (await res.json()) as { order: SparePartOrder; products: Product[] };
      onDatabaseUpdate((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === data.order.id ? data.order : o)),
        products: data.products,
      }));
      notify(`Pedido ${order.id} actualizado a: ${ORDER_STATUS_LABELS[status]}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateQuote = async (
    quote: ServiceQuote,
    updates: { status?: ServiceQuoteStatus; assignedOperator?: string; finalAgreedPrice?: number }
  ) => {
    setBusyId(quote.id);
    try {
      const res = await fetch(`/api/service-quotes/${quote.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as ServiceQuote;
      onDatabaseUpdate((prev) => ({
        ...prev,
        serviceQuotes: prev.serviceQuotes.map((q) => (q.id === updated.id ? updated : q)),
      }));
      setQuoteDrafts((prev) => {
        const next = { ...prev };
        delete next[quote.id];
        return next;
      });
      notify(`Cotización ${quote.id} guardada correctamente.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateTariff = async (
    zone: DistanceZoneTariff,
    updates: Partial<DistanceZoneTariff>
  ) => {
    setBusyId(zone.id);
    try {
      const res = await fetch(`/api/tariffs/${zone.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as DistanceZoneTariff;
      onDatabaseUpdate((prev) => ({
        ...prev,
        zoneTariffs: prev.zoneTariffs.map((z) => (z.id === updated.id ? updated : z)),
      }));
      setTariffDrafts((prev) => {
        const next = { ...prev };
        delete next[zone.id];
        return next;
      });
      notify(`Tarifa guardada: ${updated.name}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateInternalRequest = async (
    reqItem: InternalPartRequest,
    updates: {
      status?: InternalRequestStatus;
      estimatedArrival?: string;
      quotedUnitPrice?: number;
      replenishStock?: number;
    }
  ) => {
    setBusyId(reqItem.id);
    try {
      const res = await fetch(`/api/internal-requests/${reqItem.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(updates),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        internalRequest: InternalPartRequest;
        products: Product[];
      };
      onDatabaseUpdate((prev) => ({
        ...prev,
        internalRequests: prev.internalRequests.map((r) =>
          r.id === data.internalRequest.id ? data.internalRequest : r
        ),
        products: data.products,
      }));
      notify(`Solicitud ${reqItem.id} actualizada.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="py-10 lg:py-14 bg-[#F4F7FB] min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Admin Portal Header Banner */}
        <div className="bg-[#0B2545] text-white rounded-xl p-6 sm:p-8 border border-[#193B68] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#FBBF24]">
              PORTAL ADMINISTRACIÓN · {currentUser.jobTitle || 'Logística y Operaciones'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Gestión de Stock, Dashboard de Ventas y Dashboard de Servicios
            </h1>
            <p className="text-xs sm:text-sm text-[#D4E0F0]">
              Sesión activa: <strong>{currentUser.name}</strong> ({currentUser.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSwitchToClientView}
              className="px-4 py-2 text-xs font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg cursor-pointer whitespace-nowrap"
            >
              Ver tienda como Cliente
            </button>
            <button
              type="button"
              onClick={onRefreshAdminDb}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#FECACA] bg-[#7F1D1D]/50 hover:bg-[#7F1D1D] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Executive Overview Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-4">
            <p className="text-xs text-[#475B75] font-medium">Stock crítico (&lt; 3 und.)</p>
            <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#EA580C] tabular-nums mt-1">
              {lowStockProducts.length}
            </p>
            <p className="text-[11px] text-[#B91C1C] mt-0.5 tabular-nums">
              + {outOfStockProducts.length} agotados · {totalInventoryUnits} und. totales
            </p>
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-4">
            <p className="text-xs text-[#475B75] font-medium">Ventas acumuladas</p>
            <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#1D4ED8] tabular-nums mt-1">
              S/ {totalSalesRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#475B75] mt-0.5 tabular-nums">
              {validOrders.length} pedidos · {pendingOrders.length} por confirmar
            </p>
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-4">
            <p className="text-xs text-[#475B75] font-medium">Servicios cotizados</p>
            <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#0B2545] tabular-nums mt-1">
              S/ {totalServicesQuoted.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#475B75] mt-0.5 tabular-nums">
              {db.serviceQuotes.length} servicios · Salida Sede Central Ica
            </p>
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-4">
            <p className="text-xs text-[#475B75] font-medium">Solicitudes y Correo Web</p>
            <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#0B2545] tabular-nums mt-1">
              {db.contactInquiries.length + db.internalRequests.length}
            </p>
            <p className="text-[11px] text-[#475B75] mt-0.5 tabular-nums">
              {db.partInterests.length} intereses de compra registrados
            </p>
          </div>
        </div>

        {statusFeedback && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Admin Navigation Tabs (Clear & Numbered) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              {
                id: 'stock',
                label: `1. Inventario y Stock (${lowStockProducts.length} alertas)`,
                icon: Package,
              },
              {
                id: 'sales',
                label: `2. Ventas y Cobros (${pendingOrders.length} por cobrar)`,
                icon: TrendingUp,
              },
              {
                id: 'services',
                label: `3. Servicios y Viáticos (${db.serviceQuotes.length})`,
                icon: BarChart3,
              },
              {
                id: 'requests',
                label: `4. Pedidos Especiales (${db.internalRequests.length})`,
                icon: ClipboardList,
              },
              {
                id: 'inquiries',
                label: `5. Correo Web (${db.contactInquiries.length})`,
                icon: Mail,
              },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#0B2545] text-white border-[#0B2545]'
                    : 'bg-white text-[#344863] border-[#DCE4F0] hover:border-[#1D4ED8]'
                }`}
              >
                <Icon className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: FULL STOCK EDITOR & LOW-STOCK ALERTS */}
        {activeTab === 'stock' && (
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#DCE4F0]">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  Editor de Stock Real, Precios y Ubicación en Almacén
                </h2>
                <p className="text-xs text-[#475B75]">
                  Valorización estimada en almacén:{' '}
                  <strong className="font-mono text-[#0B2545] tabular-nums">
                    S/ {totalInventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>{' '}
                  ({db.products.length} SKUs activos)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{showAddForm ? 'Cerrar formulario' : 'Agregar nuevo repuesto'}</span>
              </button>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#9A3412]">
                      Alerta de reposición: {lowStockProducts.length} repuesto(s) con stock menor a
                      3 unidades
                    </p>
                    <p className="text-xs text-[#7C2D12]">
                      {lowStockProducts.map((p) => `${p.sku} (${p.stock} und.)`).join(' · ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOnlyCritical((v) => !v)}
                  className="hit-area px-3.5 py-1.5 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {onlyCritical ? 'Ver todo el catálogo' : 'Filtrar críticos (< 3)'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="search"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Buscar SKU, nombre o modelo compatible..."
                className="sm:col-span-8 px-3.5 py-2 text-sm bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg"
              />
              <select
                value={stockCategory}
                onChange={(e) => setStockCategory(e.target.value)}
                aria-label="Filtrar categoría en inventario"
                className="sm:col-span-4 px-3 py-2 text-sm bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg"
              >
                <option value="Todas">Todas las categorías ({db.products.length})</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateProduct}
                className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Ej. ALL-FIL-9920"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Nombre del repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Filtro hidráulico de alta presión"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Modelos compatibles
                  </label>
                  <input
                    type="text"
                    value={newModels}
                    onChange={(e) => setNewModels(e.target.value)}
                    placeholder="Ej. John Deere 6110J / New Holland TM7010"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Precio unitario (S/) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Stock inicial (und.) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0B2545] mb-1">
                    Ubicación en almacén
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={busyId === 'new-product'}
                    className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#EA580C] rounded-lg cursor-pointer"
                  >
                    Guardar en inventario real
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredStock.map((product) => {
                const isLow = product.stock > 0 && product.stock < 3;
                const isZero = product.stock === 0;
                const draftStock = stockDrafts[product.id] ?? product.stock;
                const draftPrice = priceDrafts[product.id] ?? product.price;
                const draftLoc = locationDrafts[product.id] ?? product.warehouseLocation;
                const hasPendingEdit =
                  draftStock !== product.stock ||
                  draftPrice !== product.price ||
                  draftLoc !== product.warehouseLocation;

                return (
                  <div
                    key={product.id}
                    className={`p-3.5 rounded-lg border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      isZero
                        ? 'bg-[#FEF2F2] border-[#FECACA]'
                        : isLow
                          ? 'bg-[#FFF7ED] border-[#FDBA74]'
                          : 'bg-[#F4F7FB] border-[#DCE4F0]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#1D4ED8]">{product.sku}</span>
                        <span className="text-[#475B75]">· {product.category}</span>
                        {isLow && (
                          <span className="font-semibold text-[#C2410C]">
                            · Stock crítico (&lt; 3)
                          </span>
                        )}
                        {isZero && (
                          <span className="font-semibold text-[#B91C1C]">· Agotado (0 und.)</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#0B2545] truncate">{product.name}</p>
                      <input
                        type="text"
                        aria-label={`Ubicación de ${product.sku}`}
                        value={draftLoc}
                        onChange={(e) =>
                          setLocationDrafts((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="w-full max-w-md px-2.5 py-1 text-[11px] text-[#344863] bg-white border border-[#DCE4F0] rounded"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1 text-xs text-[#475B75]">
                        <span>S/</span>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          aria-label={`Precio de ${product.sku}`}
                          value={draftPrice}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [product.id]: Math.max(1, Number(e.target.value)),
                            }))
                          }
                          className="w-20 px-2 py-1 text-xs font-mono font-semibold text-[#0B2545] bg-white border border-[#C7D3E6] rounded tabular-nums"
                        />
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === product.id || product.stock <= 0}
                          onClick={() =>
                            handleUpdateProduct(product, { stock: Math.max(0, product.stock - 1) })
                          }
                          className="hit-area px-2.5 py-1 text-xs font-semibold bg-white border border-[#C7D3E6] rounded cursor-pointer disabled:opacity-40"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          min={0}
                          aria-label={`Stock de ${product.sku}`}
                          value={draftStock}
                          onChange={(e) =>
                            setStockDrafts((prev) => ({
                              ...prev,
                              [product.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            }))
                          }
                          className="w-16 px-2 py-1 text-xs font-mono font-bold text-center text-[#0B2545] bg-white border border-[#C7D3E6] rounded tabular-nums"
                        />
                        <button
                          type="button"
                          disabled={busyId === product.id}
                          onClick={() => handleUpdateProduct(product, { stock: product.stock + 1 })}
                          className="hit-area px-2.5 py-1 text-xs font-semibold bg-white border border-[#C7D3E6] rounded cursor-pointer"
                        >
                          +1
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={busyId === product.id}
                        onClick={() => handleUpdateProduct(product, { stock: product.stock + 5 })}
                        className="hit-area px-2.5 py-1 text-xs font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded cursor-pointer whitespace-nowrap"
                      >
                        +5 reponer
                      </button>

                      {hasPendingEdit && (
                        <button
                          type="button"
                          disabled={busyId === product.id}
                          onClick={() =>
                            handleUpdateProduct(product, {
                              stock: draftStock,
                              price: draftPrice,
                              warehouseLocation: draftLoc,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded cursor-pointer whitespace-nowrap"
                        >
                          <Save className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Guardar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DASHBOARD DE VENTAS */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            {/* Sales KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Ingresos Brutos (Repuestos)</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#0B2545] tabular-nums mt-1">
                  S/ {totalSalesRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  {validOrders.length} pedidos válidos
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Ventas Confirmadas / Entregadas</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#16A34A] tabular-nums mt-1">
                  S/ {confirmedSalesRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  Pagos confirmados
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Pendiente de Pago</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#EA580C] tabular-nums mt-1">
                  S/ {pendingRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#C2410C] mt-1 tabular-nums">
                  {pendingOrders.length} pedido(s) esperando el pago del cliente
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Ticket Promedio y Volumen</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#1D4ED8] tabular-nums mt-1">
                  S/ {averageOrderTicket.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  {totalUnitsSold} repuestos despachados
                </p>
              </div>
            </div>

            {/* Sales Visual Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    Ventas por Categoría de Repuestos
                  </h2>
                  <p className="text-xs text-[#475B75]">
                    Participación de ingresos S/ y unidades vendidas por línea técnica
                  </p>
                </div>

                {salesByCategory.length === 0 ? (
                  <p className="text-sm text-[#475B75]">Sin ventas registradas aún.</p>
                ) : (
                  <div className="space-y-3.5">
                    {salesByCategory.map((row) => {
                      const pct = Math.round((row.revenue / maxCategoryRevenue) * 100);
                      return (
                        <div key={row.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0B2545]">{row.category}</span>
                            <span className="font-mono text-[#344863] tabular-nums">
                              {row.units} und. ·{' '}
                              <strong className="text-[#1D4ED8]">
                                S/ {row.revenue.toFixed(2)}
                              </strong>
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#EAF0F8] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1D4ED8] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Deposit Banks & Delivery Method Breakdown */}
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    Recaudación por Forma de Pago y Canal de Entrega
                  </h2>
                  <p className="text-xs text-[#475B75]">
                    Pagos confirmados según la forma de pago elegida y la modalidad de entrega
                  </p>
                </div>

                <div className="space-y-3">
                  {paymentChannelsSummary.map((bank) => {
                    const paidTotal = paymentChannelsSummary.reduce((sum, c) => sum + c.amount, 0);
                    const pct = paidTotal > 0 ? Math.round((bank.amount / paidTotal) * 100) : 0;
                    return (
                      <div key={bank.channel} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#0B2545]">{bank.label}</span>
                          <span className="font-mono text-[#344863] tabular-nums">
                            {bank.count} op. · S/ {bank.amount.toFixed(2)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-[#F4F7FB] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#EA580C] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#DCE4F0]">
                  <div className="p-3 bg-[#F4F7FB] rounded-lg">
                    <p className="text-[11px] text-[#475B75]">Envío Agencia / Directo</p>
                    <p className="font-mono text-lg font-bold text-[#0B2545] tabular-nums">
                      {envioOrdersCount} pedidos
                    </p>
                  </div>
                  <div className="p-3 bg-[#F4F7FB] rounded-lg">
                    <p className="text-[11px] text-[#475B75]">Recojo Presencial Sede</p>
                    <p className="font-mono text-lg font-bold text-[#0B2545] tabular-nums">
                      {presencialOrdersCount} pedidos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Sold Parts Table */}
            <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Repuestos con Mayor Rotación en Ventas
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE4F0] text-[#475B75] text-xs">
                      <th className="py-2 pr-4 font-semibold">SKU</th>
                      <th className="py-2 pr-4 font-semibold">Repuesto</th>
                      <th className="py-2 pr-4 font-semibold">Categoría</th>
                      <th className="py-2 pr-4 font-semibold text-right">Unidades</th>
                      <th className="py-2 font-semibold text-right">Facturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE4F0]">
                    {topSoldParts.map((part) => (
                      <tr key={part.sku} className="hover:bg-[#F4F7FB]">
                        <td className="py-2.5 pr-4 font-mono text-xs font-bold text-[#1D4ED8] whitespace-nowrap">
                          {part.sku}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-[#0B2545]">{part.name}</td>
                        <td className="py-2.5 pr-4 text-xs text-[#475B75]">{part.category}</td>
                        <td className="py-2.5 pr-4 font-mono text-right tabular-nums">
                          {part.units}
                        </td>
                        <td className="py-2.5 font-mono font-bold text-right text-[#EA580C] tabular-nums whitespace-nowrap">
                          S/ {part.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Management & Deposit Validation */}
            <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  Cobros y Gestión de Pedidos
                </h2>
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value as 'all' | OrderStatus)}
                  aria-label="Filtrar estado de pedidos"
                  className="px-3 py-1.5 text-xs bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg"
                >
                  <option value="all">Todos los pedidos ({db.orders.length})</option>
                  <option value="pendiente_pago">Pendiente de pago</option>
                  <option value="pago_confirmado">Pago confirmado</option>
                  <option value="en_despacho">Despachado / listo para recojo</option>
                  <option value="entregado">Entregado</option>
                  <option value="expirado">Código vencido</option>
                  <option value="observado">Anulado</option>
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="text-sm text-[#475B75]">No hay pedidos en este estado.</p>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-[#1D4ED8]">
                            {order.id} · {ORDER_STATUS_LABELS[order.status]}
                          </p>
                          <h3 className="text-sm font-bold text-[#0B2545]">
                            {order.customerName}
                            {order.companyOrFarm && order.companyOrFarm !== 'Persona Natural'
                              ? ` — ${order.companyOrFarm}`
                              : ' (Persona Natural)'}
                          </h3>
                          <p className="text-xs text-[#475B75]">
                            RUC/DNI: <span className="font-mono">{order.rucOrDni}</span> · Tel:{' '}
                            {order.phone}
                            {order.email ? ` · Correo: ${order.email}` : ''} · {order.deliveryAddress}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-base font-bold text-[#EA580C] tabular-nums">
                            S/ {order.total.toFixed(2)}
                          </p>
                          <p className="font-mono text-xs text-[#0B2545]">
                            Código {formatPaymentCode(order.paymentCode)}
                          </p>
                          <p className="text-[11px] text-[#475B75]">
                            {PAYMENT_CHANNEL_LABELS[order.paymentChannel]}
                            {order.operationNumber ? ` · Op. ${order.operationNumber}` : ''}
                          </p>
                          {order.status === 'pendiente_pago' && (
                            <p className="text-[11px] text-[#92400E]">
                              Vence{' '}
                              {new Date(order.paymentDeadline).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                          {order.trackingGuide && (
                            <p className="text-[11px] text-[#475B75]">
                              {order.shippingCarrier} · guía {order.trackingGuide}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#344863]">
                        Ítems: {order.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ')}
                      </p>

                      <AdminOrderActions
                        key={`${order.id}-${order.status}`}
                        order={order}
                        busy={busyId === order.id}
                        onChange={handleUpdateOrder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DASHBOARD DE SERVICIOS */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Services KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Monto Total Cotizado</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#0B2545] tabular-nums mt-1">
                  S/ {totalServicesQuoted.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  {db.serviceQuotes.length} solicitudes de servicio
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Operación y Cumplimiento</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#16A34A] tabular-nums mt-1">
                  {completedServicesCount} / {db.serviceQuotes.length}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  {activeServicesCount} activos en programación / ruta
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Atenciones Emergencia 24h</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#EA580C] tabular-nums mt-1">
                  {emergencyServicesCount}
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  {db.serviceQuotes.length - emergencyServicesCount} servicios programados
                </p>
              </div>
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-5">
                <p className="text-xs font-medium text-[#475B75]">Despliegue y Viáticos/Peajes</p>
                <p className="font-mono text-lg sm:text-2xl font-bold whitespace-nowrap text-[#1D4ED8] tabular-nums mt-1">
                  {avgServiceDistance} km prom.
                </p>
                <p className="text-[11px] text-[#475B75] mt-1 tabular-nums">
                  Viáticos + peajes: S/ {totalViaticosAndTolls.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Gráficos de servicios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    Servicios e Ingresos por Zona de Distancia (desde Ica)
                  </h2>
                  <p className="text-xs text-[#475B75]">
                    Distribución geográfica de atenciones técnicas en todo el país
                  </p>
                </div>
                <div className="space-y-3.5">
                  {servicesByZone.map((z) => {
                    const pct = Math.round((z.revenue / maxZoneRevenue) * 100);
                    return (
                      <div key={z.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#0B2545]">{z.name}</span>
                          <span className="font-mono text-[#344863] tabular-nums">
                            {z.count} srv. ·{' '}
                            <strong className="text-[#EA580C]">
                              S/ {z.revenue.toFixed(2)}
                            </strong>
                          </span>
                        </div>
                        <div className="h-2.5 bg-[#EAF0F8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#EA580C] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545]">
                    Demanda por Línea de Servicio Técnico
                  </h2>
                  <p className="text-xs text-[#475B75]">
                    Preventivo, correctivo en campo, alquiler con operador y diagnóstico ECU
                  </p>
                </div>
                <div className="space-y-3.5">
                  {servicesByType.map((row) => {
                    const pct = Math.round((row.revenue / maxServiceTypeRevenue) * 100);
                    return (
                      <div key={row.type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#0B2545]">{row.label}</span>
                          <span className="font-mono text-[#344863] tabular-nums">
                            {row.count} cot. ·{' '}
                            <strong className="text-[#1D4ED8]">S/ {row.revenue.toFixed(2)}</strong>
                          </span>
                        </div>
                        <div className="h-2.5 bg-[#EAF0F8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B2545] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Editable Distance/Viáticos/Peajes Tariffs */}
            <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Tarifas de Distancia, Viáticos y Peajes (Salida desde Ica)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {db.zoneTariffs.map((zone) => {
                  const tDraft = tariffDrafts[zone.id] ?? {};
                  const draftKm = tDraft.perKmRate ?? zone.perKmRate;
                  const draftViaticos = tDraft.operatorViaticos ?? zone.operatorViaticos;
                  const draftTolls = tDraft.tollsCost ?? zone.tollsCost;
                  const hasTariffEdit =
                    draftKm !== zone.perKmRate ||
                    draftViaticos !== zone.operatorViaticos ||
                    draftTolls !== zone.tollsCost;

                  return (
                    <div
                      key={zone.id}
                      className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#0B2545]">{zone.name}</p>
                          <p className="text-xs text-[#475B75]">{zone.rangeLabel}</p>
                        </div>
                        {hasTariffEdit && (
                          <button
                            type="button"
                            disabled={busyId === zone.id}
                            onClick={() =>
                              handleUpdateTariff(zone, {
                                perKmRate: draftKm,
                                operatorViaticos: draftViaticos,
                                tollsCost: draftTolls,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Guardar tarifa</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="block text-[#475B75] mb-1">S/ por km</span>
                          <input
                            type="number"
                            step="0.1"
                            value={draftKm}
                            onChange={(e) =>
                              setTariffDrafts((prev) => ({
                                ...prev,
                                [zone.id]: {
                                  ...prev[zone.id],
                                  perKmRate: Math.max(0, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-full px-2 py-1 bg-white border border-[#C7D3E6] rounded font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[#475B75] mb-1">Viáticos S/</span>
                          <input
                            type="number"
                            value={draftViaticos}
                            onChange={(e) =>
                              setTariffDrafts((prev) => ({
                                ...prev,
                                [zone.id]: {
                                  ...prev[zone.id],
                                  operatorViaticos: Math.max(0, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-full px-2 py-1 bg-white border border-[#C7D3E6] rounded font-mono"
                          />
                        </div>
                        <div>
                          <span className="block text-[#475B75] mb-1">Peajes S/</span>
                          <input
                            type="number"
                            value={draftTolls}
                            onChange={(e) =>
                              setTariffDrafts((prev) => ({
                                ...prev,
                                [zone.id]: {
                                  ...prev[zone.id],
                                  tollsCost: Math.max(0, Number(e.target.value)),
                                },
                              }))
                            }
                            className="w-full px-2 py-1 bg-white border border-[#C7D3E6] rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Quotes Manager */}
            <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#0B2545]">
                  Asignación de Técnicos y Control de Cotizaciones
                </h2>
                <select
                  value={serviceStatusFilter}
                  onChange={(e) =>
                    setServiceStatusFilter(e.target.value as 'all' | ServiceQuoteStatus)
                  }
                  aria-label="Filtrar por estado de servicio"
                  className="px-3 py-1.5 text-xs bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg"
                >
                  <option value="all">Todos los estados ({db.serviceQuotes.length})</option>
                  <option value="recibida">Recibida</option>
                  <option value="operador_asignado">Operador asignado</option>
                  <option value="en_ruta">En ruta</option>
                  <option value="completado">Completado</option>
                </select>
              </div>

              {filteredServiceQuotes.length === 0 ? (
                <p className="text-sm text-[#475B75]">
                  No hay cotizaciones de servicio para el filtro seleccionado.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredServiceQuotes.map((q) => {
                    const qDraft = quoteDrafts[q.id] ?? {};
                    const draftOp = qDraft.assignedOperator ?? q.assignedOperator;
                    const draftPrice = qDraft.finalAgreedPrice ?? getQuoteAmount(q);
                    const hasQuoteEdit =
                      draftOp !== q.assignedOperator || draftPrice !== getQuoteAmount(q);

                    return (
                      <div
                        key={q.id}
                        className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs font-bold text-[#1D4ED8]">
                              {q.id} · Salida Sede Ica ·{' '}
                              {q.urgency === 'emergencia_24h' ? 'EMERGENCIA 24H' : 'Programado'} ·{' '}
                              {QUOTE_STATUS_LABELS[q.status]}
                            </p>
                            <p className="text-sm font-bold text-[#0B2545]">
                              {SERVICE_BASE_TARIFFS[q.serviceType].label} · {q.machineBrandModel}
                            </p>
                            <p className="text-xs text-[#344863]">
                              Cliente: {q.customerName}
                              {q.companyOrFarm && q.companyOrFarm !== 'Persona Natural'
                                ? ` (${q.companyOrFarm})`
                                : ' (Persona Natural)'}{' '}
                              · Tel: {q.phone}
                              {q.customerEmail ? ` · Correo: ${q.customerEmail}` : ''} ·{' '}
                              {q.locationDetail} ({q.distanceKm} km)
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-base font-bold text-[#EA580C] tabular-nums">
                              S/ {getQuoteAmount(q).toFixed(2)}
                            </span>
                            <p className="text-[11px] font-mono text-[#475B75] tabular-nums">
                              Viáticos S/ {q.breakdown.operatorViaticos} · Peajes S/{' '}
                              {q.breakdown.tollsCost ?? 0}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-medium text-[#475B75] mb-1">
                              Técnico / Unidad móvil asignada
                            </label>
                            <input
                              type="text"
                              value={draftOp}
                              onChange={(e) =>
                                setQuoteDrafts((prev) => ({
                                  ...prev,
                                  [q.id]: { ...prev[q.id], assignedOperator: e.target.value },
                                }))
                              }
                              placeholder="Nombre del técnico o unidad"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-[#C7D3E6] rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-medium text-[#475B75] mb-1">
                              Monto acordado (S/)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={draftPrice}
                              onChange={(e) =>
                                setQuoteDrafts((prev) => ({
                                  ...prev,
                                  [q.id]: {
                                    ...prev[q.id],
                                    finalAgreedPrice: Math.max(0, Number(e.target.value)),
                                  },
                                }))
                              }
                              aria-label={`Monto final acordado ${q.id}`}
                              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#C7D3E6] rounded-lg tabular-nums"
                            />
                          </div>
                          <div className={hasQuoteEdit ? 'sm:col-span-2' : 'sm:col-span-4'}>
                            <label className="block text-[11px] font-medium text-[#475B75] mb-1">
                              Estado
                            </label>
                            <select
                              value={q.status}
                              onChange={(e) =>
                                handleUpdateQuote(q, {
                                  status: e.target.value as ServiceQuoteStatus,
                                })
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-[#C7D3E6] rounded-lg"
                            >
                              <option value="recibida">Recibida</option>
                              <option value="operador_asignado">Operador asignado</option>
                              <option value="en_ruta">En ruta</option>
                              <option value="completado">Completado</option>
                            </select>
                          </div>
                          {hasQuoteEdit && (
                            <div className="sm:col-span-2">
                              <button
                                type="button"
                                disabled={busyId === q.id}
                                onClick={() =>
                                  handleUpdateQuote(q, {
                                    assignedOperator: draftOp,
                                    finalAgreedPrice: draftPrice,
                                  })
                                }
                                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Guardar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: INTERNAL PART REQUESTS & PART INTERESTS */}
        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Solicitudes Internas de Reposición / Importación
              </h2>
              {db.internalRequests.map((reqItem) => (
                <div
                  key={reqItem.id}
                  className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#EA580C]">
                        {reqItem.id} ·{' '}
                        {reqItem.urgency === 'urgente_parada_maquina'
                          ? 'URGENTE MÁQUINA PARADA'
                          : 'Estándar'}
                      </p>
                      <p className="text-sm font-bold text-[#0B2545]">
                        {reqItem.partName} ({reqItem.quantityNeeded} und.)
                      </p>
                      <p className="text-xs text-[#475B75]">
                        {reqItem.requesterName} ({reqItem.companyOrFarm}) · Tel: {reqItem.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reqItem.status}
                      onChange={(e) =>
                        handleUpdateInternalRequest(reqItem, {
                          status: e.target.value as InternalRequestStatus,
                        })
                      }
                      className="px-3 py-1.5 text-xs bg-white border border-[#C7D3E6] rounded-lg"
                    >
                      <option value="pendiente_logistica">Pendiente logística</option>
                      <option value="cotizando_proveedor">Cotizando proveedor</option>
                      <option value="en_transito_almacen">En tránsito a almacén</option>
                      <option value="disponible_en_stock">Disponible en stock</option>
                    </select>
                    {reqItem.productId && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateInternalRequest(reqItem, {
                            status: 'disponible_en_stock',
                            replenishStock: reqItem.quantityNeeded,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] rounded-lg cursor-pointer"
                      >
                        Ingresar +{reqItem.quantityNeeded} al stock
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B2545]">
                Registros &quot;Me interesa&quot; en Catálogo
              </h2>
              {db.partInterests.length === 0 ? (
                <p className="text-sm text-[#475B75]">Sin intereses registrados aún.</p>
              ) : (
                <div className="space-y-2.5">
                  {db.partInterests.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg text-xs"
                    >
                      <p className="font-mono font-bold text-[#1D4ED8]">{item.sku}</p>
                      <p className="font-semibold text-[#0B2545]">{item.partName}</p>
                      <p className="text-[#475B75] mt-0.5">{item.contactNote}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: INSTITUTIONAL WEB EMAIL INQUIRIES */}
        {activeTab === 'inquiries' && (
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B2545]">
              Consultas Recibidas al Correo Institucional (contacto@allpa.pe)
            </h2>
            {db.contactInquiries.length === 0 ? (
              <p className="text-sm text-[#475B75]">
                No hay consultas registradas desde el formulario del footer todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {db.contactInquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-4 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-[#1D4ED8]">
                        {inq.id} · Sede Central Ica
                      </span>
                      <span className="text-[#475B75]">
                        {new Date(inq.createdAt).toLocaleString('es-PE')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#0B2545]">{inq.subject}</p>
                    <p className="text-xs text-[#344863]">{inq.message}</p>
                    <p className="text-xs text-[#475B75]">
                      De: <strong>{inq.name}</strong> ({inq.email})
                      {inq.phone ? ` · Tel: ${inq.phone}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
