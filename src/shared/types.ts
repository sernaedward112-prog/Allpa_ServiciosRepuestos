export type ProductCategory =
  | 'Hidráulica'
  | 'Inyección'
  | 'Frenos y Embrague'
  | 'Refrigeración'
  | 'Filtración'
  | 'Eléctrico'
  | 'Motor y Transmisión'
  | 'Implementos Agrícolas'
  | 'Lubricantes y Sellos';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  compatibleModels: string;
  specs: string;
  price: number;
  stock: number;
  minStock: number;
  warehouseLocation: string;
  imageUrl: string;
  updatedAt: string;
}

export interface PartInterest {
  id: string;
  productId: string;
  sku: string;
  partName: string;
  contactNote: string;
  regionName: string;
  createdAt: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceBase: 'ica' | 'piura' | 'huacho';
  subject: string;
  message: string;
  recipientEmail: string;
  createdAt: string;
}

export type DeliveryMethod = 'presencial' | 'envio';

/** Canal con el que el cliente decide pagar. El código de pago es el mismo para los tres. */
export type PaymentChannel = 'qr' | 'transferencia' | 'agente';

export type OrderStatus =
  | 'pendiente_pago'
  | 'pago_confirmado'
  | 'en_despacho'
  | 'entregado'
  | 'observado'
  | 'expirado';

/** Hito del seguimiento del pedido (lo ve el cliente en su línea de tiempo). */
export interface OrderEvent {
  at: string;
  title: string;
  detail?: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface SparePartOrder {
  id: string;
  userId?: string;
  customerName: string;
  companyOrFarm: string;
  rucOrDni: string;
  phone: string;
  email: string;
  items: OrderItem[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  shippingCarrier: string;
  shippingFee: number;
  subtotal: number;
  total: number;
  paymentChannel: PaymentChannel;
  /** Código de pago generado por el sistema al crear el pedido (10 dígitos). */
  paymentCode: string;
  /** Fecha límite para pagar; vencida, el pedido expira y el stock se libera. */
  paymentDeadline: string;
  /** Número de operación asignado por el sistema cuando se registra el pago. */
  operationNumber?: string;
  paidAt?: string;
  /** Número de guía o seguimiento de la agencia (solo envíos). */
  trackingGuide?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  status: OrderStatus;
  events: OrderEvent[];
  logisticsNotes: string;
  createdAt: string;
  confirmedAt?: string;
}

/** Lo que se muestra en el seguimiento público: sin RUC/DNI, correo ni notas internas. */
export type PublicOrderTracking = Pick<
  SparePartOrder,
  | 'id'
  | 'items'
  | 'deliveryMethod'
  | 'deliveryAddress'
  | 'shippingCarrier'
  | 'shippingFee'
  | 'subtotal'
  | 'total'
  | 'paymentChannel'
  | 'paymentCode'
  | 'paymentDeadline'
  | 'operationNumber'
  | 'paidAt'
  | 'trackingGuide'
  | 'dispatchedAt'
  | 'deliveredAt'
  | 'status'
  | 'events'
  | 'createdAt'
> & { customerFirstName: string };

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  qr: 'Yape / Plin con QR',
  transferencia: 'Transferencia bancaria',
  agente: 'Agentes y bodegas',
};

export function orderStatusLabel(status: OrderStatus, deliveryMethod: DeliveryMethod): string {
  switch (status) {
    case 'pendiente_pago':
      return 'Pendiente de pago';
    case 'pago_confirmado':
      return 'Pago confirmado';
    case 'en_despacho':
      return deliveryMethod === 'envio' ? 'En camino' : 'Listo para recojo';
    case 'entregado':
      return 'Entregado';
    case 'observado':
      return 'Anulado';
    case 'expirado':
      return 'Código vencido';
  }
}

export function formatPaymentCode(code: string): string {
  const d = code.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}` : code;
}

export type InternalRequestStatus =
  | 'pendiente_logistica'
  | 'cotizando_proveedor'
  | 'en_transito_almacen'
  | 'disponible_en_stock';

export interface InternalPartRequest {
  id: string;
  userId?: string;
  productId?: string;
  partName: string;
  oemCode: string;
  machineModel: string;
  quantityNeeded: number;
  requesterName: string;
  companyOrFarm: string;
  phone: string;
  urgency: 'normal' | 'urgente_parada_maquina';
  status: InternalRequestStatus;
  estimatedArrival: string;
  quotedUnitPrice?: number;
  notes: string;
  createdAt: string;
}

export type ServiceType =
  | 'mantenimiento_preventivo'
  | 'mantenimiento_correctivo'
  | 'alquiler_con_operador'
  | 'diagnostico_electronico';

export type PreventiveTier = '250h' | '500h' | '1000h' | '2000h';

export type DistanceZoneId = 'zona_a' | 'zona_b' | 'zona_c' | 'zona_d';

export type ServiceQuoteStatus =
  | 'recibida'
  | 'operador_asignado'
  | 'en_ruta'
  | 'completado';

export interface QuoteBreakdown {
  baseServiceCost: number;
  mobilizationCost: number;
  operatorViaticos: number;
  tollsCost: number;
  suppliesEstimate: number;
  urgencySurcharge: number;
  subtotal: number;
  igv: number;
  total: number;
}

export type ServiceBaseId = 'ica' | 'piura' | 'huacho';

export interface ServiceBase {
  id: ServiceBaseId;
  name: string;
  tag: string;
  coverageNote: string;
  defaultRegionId: string;
}

export const SERVICE_BASES: ServiceBase[] = [
  {
    id: 'ica',
    name: 'Sede Central Ica',
    tag: 'Sede Única · Cobertura Nacional',
    coverageNote: 'Salida técnica desde Ica hacia todo el Perú (viáticos y peajes según distancia)',
    defaultRegionId: 'ica_valles',
  },
];

export interface ServiceQuote {
  id: string;
  userId?: string;
  serviceType: ServiceType;
  preventiveTier?: PreventiveTier;
  machineType: string;
  machineBrandModel: string;
  operatingHours: number;
  serviceBase?: ServiceBaseId;
  regionName: string;
  zoneId: DistanceZoneId;
  distanceKm: number;
  includeOperator: boolean;
  urgency: 'programado' | 'emergencia_24h';
  requirementsChecklist: string[];
  customNotes: string;
  preferredDate: string;
  customerName: string;
  companyOrFarm: string;
  phone: string;
  customerEmail?: string;
  locationDetail: string;
  breakdown: QuoteBreakdown;
  finalAgreedPrice?: number;
  status: ServiceQuoteStatus;
  assignedOperator: string;
  createdAt: string;
}

export interface DistanceZoneTariff {
  id: DistanceZoneId;
  name: string;
  rangeLabel: string;
  defaultKm: number;
  minKm: number;
  maxKm: number;
  fixedOperatorDispatchFee: number;
  perKmRate: number;
  operatorViaticos: number;
  tollsCost: number;
  responseWindow: string;
}

export interface PeruRegionPreset {
  id: string;
  label: string;
  zoneId: DistanceZoneId;
  suggestedKm: number;
  recommendedBase: ServiceBaseId;
}

export const PERU_REGIONS: PeruRegionPreset[] = [
  {
    id: 'ica_local',
    label: 'Ica Local — Villacurí / Los Aquijes / Santiago / Subtanjalla',
    zoneId: 'zona_a',
    suggestedKm: 20,
    recommendedBase: 'ica',
  },
  {
    id: 'ica_valles',
    label: 'Ica Región — Pisco / Chincha / Palpa / Nazca',
    zoneId: 'zona_b',
    suggestedKm: 75,
    recommendedBase: 'ica',
  },
  {
    id: 'lima_centro',
    label: 'Lima Sur y Norte — Cañete / Lima / Huaral / Huacho / Barranca',
    zoneId: 'zona_c',
    suggestedKm: 280,
    recommendedBase: 'ica',
  },
  {
    id: 'costa_sur',
    label: 'Costa Sur — Arequipa / Majes / Camaná / Moquegua / Tacna',
    zoneId: 'zona_d',
    suggestedKm: 620,
    recommendedBase: 'ica',
  },
  {
    id: 'costa_norte',
    label: 'Costa Norte — Trujillo / Virú / Lambayeque / Olmos / Piura',
    zoneId: 'zona_d',
    suggestedKm: 850,
    recommendedBase: 'ica',
  },
  {
    id: 'sierra_selva',
    label: 'Sierra y Selva — Ayacucho / Huancayo / Cusco / San Martín',
    zoneId: 'zona_d',
    suggestedKm: 540,
    recommendedBase: 'ica',
  },
];

export const DISTANCE_ZONES: DistanceZoneTariff[] = [
  {
    id: 'zona_a',
    name: 'Zona A — Ica Local',
    rangeLabel: '0 – 30 km alrededor de Sede Central Ica',
    defaultKm: 20,
    minKm: 1,
    maxKm: 30,
    fixedOperatorDispatchFee: 65,
    perKmRate: 2.8,
    operatorViaticos: 35,
    tollsCost: 0,
    responseWindow: 'Mismo día (2–4 h)',
  },
  {
    id: 'zona_b',
    name: 'Zona B — Valles de Ica',
    rangeLabel: '31 – 120 km (Pisco, Chincha, Palpa, Nazca)',
    defaultKm: 75,
    minKm: 31,
    maxKm: 120,
    fixedOperatorDispatchFee: 120,
    perKmRate: 3.1,
    operatorViaticos: 90,
    tollsCost: 36,
    responseWindow: 'Mismo día / 24 h',
  },
  {
    id: 'zona_c',
    name: 'Zona C — Regional Interprovincial',
    rangeLabel: '121 – 350 km (Cañete, Lima, Huacho, Ayacucho)',
    defaultKm: 260,
    minKm: 121,
    maxKm: 350,
    fixedOperatorDispatchFee: 210,
    perKmRate: 3.4,
    operatorViaticos: 185,
    tollsCost: 78,
    responseWindow: '24 – 36 horas',
  },
  {
    id: 'zona_d',
    name: 'Zona D — Cobertura Nacional',
    rangeLabel: 'Más de 350 km (Costa Norte, Sur, Sierra y Selva)',
    defaultKm: 620,
    minKm: 351,
    maxKm: 1200,
    fixedOperatorDispatchFee: 390,
    perKmRate: 3.8,
    operatorViaticos: 360,
    tollsCost: 145,
    responseWindow: '48 – 72 horas',
  },
];

export const SERVICE_BASE_TARIFFS: Record<
  ServiceType,
  { label: string; description: string; baseCost: number; defaultSupplies: number }
> = {
  mantenimiento_preventivo: {
    label: 'Mantenimiento Preventivo',
    description:
      'Inspección multipunto programada, cambio de fluidos, filtros OEM/equivalentes y calibración de trabajo.',
    baseCost: 380,
    defaultSupplies: 290,
  },
  mantenimiento_correctivo: {
    label: 'Mantenimiento Correctivo en Campo',
    description:
      'Intervención técnica directa por falla mecánica, hidráulica o de transmisión con unidad móvil equipada.',
    baseCost: 540,
    defaultSupplies: 180,
  },
  alquiler_con_operador: {
    label: 'Alquiler de Maquinaria con Operador',
    description:
      'Despliegue de tractor agrícola o equipo auxiliar con operador certificado por jornada (8 horas).',
    baseCost: 920,
    defaultSupplies: 120,
  },
  diagnostico_electronico: {
    label: 'Diagnóstico Electrónico e Inyección',
    description:
      'Escaneo computarizado de ECU, pruebas de presión common-rail y calibración de sensores en fundo.',
    baseCost: 310,
    defaultSupplies: 60,
  },
};

export const PREVENTIVE_TIER_MULTIPLIER: Record<
  PreventiveTier,
  { label: string; serviceDelta: number; suppliesCost: number }
> = {
  '250h': { label: 'Cartilla 250 horas', serviceDelta: 0, suppliesCost: 240 },
  '500h': { label: 'Cartilla 500 horas', serviceDelta: 110, suppliesCost: 410 },
  '1000h': { label: 'Cartilla 1000 horas', serviceDelta: 260, suppliesCost: 780 },
  '2000h': { label: 'Cartilla 2000 horas (Overhaul menor)', serviceDelta: 490, suppliesCost: 1350 },
};

export const REQUIREMENT_OPTIONS: { id: string; label: string; estimatedCost: number }[] = [
  {
    id: 'filtros_lubricantes',
    label: 'Suministro de kit de filtros y aceite hidráulico/motor',
    estimatedCost: 220,
  },
  {
    id: 'escaneo_ecu',
    label: 'Escaneo electrónico OEM y reporte digital de códigos',
    estimatedCost: 95,
  },
  {
    id: 'calibracion_inyectores',
    label: 'Prueba y calibración de sistema de inyección diésel',
    estimatedCost: 160,
  },
  {
    id: 'presion_hidraulica',
    label: 'Medición de caudal y presión de bomba hidráulica',
    estimatedCost: 110,
  },
  {
    id: 'certificado_operatividad',
    label: 'Emisión de certificado de operatividad firmado',
    estimatedCost: 75,
  },
];

export function calculateServiceQuoteBreakdown(params: {
  serviceType: ServiceType;
  preventiveTier?: PreventiveTier;
  zoneId: DistanceZoneId;
  distanceKm: number;
  includeOperator: boolean;
  urgency: 'programado' | 'emergencia_24h';
  requirementsChecklist: string[];
  zones?: DistanceZoneTariff[];
}): QuoteBreakdown {
  const zoneSource = params.zones && params.zones.length > 0 ? params.zones : DISTANCE_ZONES;
  const zone = zoneSource.find((z) => z.id === params.zoneId) ?? zoneSource[0];
  const serviceInfo = SERVICE_BASE_TARIFFS[params.serviceType];

  let baseServiceCost = serviceInfo.baseCost;
  let suppliesEstimate = serviceInfo.defaultSupplies;

  if (params.serviceType === 'mantenimiento_preventivo' && params.preventiveTier) {
    const tier = PREVENTIVE_TIER_MULTIPLIER[params.preventiveTier];
    baseServiceCost += tier.serviceDelta;
    suppliesEstimate = tier.suppliesCost;
  }

  for (const reqId of params.requirementsChecklist) {
    const found = REQUIREMENT_OPTIONS.find((r) => r.id === reqId);
    if (found) {
      suppliesEstimate += found.estimatedCost;
    }
  }

  const clampedKm = Math.max(1, Math.min(1500, Number(params.distanceKm) || zone.defaultKm));
  const mobilizationCost = Math.round(
    zone.fixedOperatorDispatchFee + clampedKm * zone.perKmRate
  );
  const operatorViaticos = params.includeOperator ? zone.operatorViaticos : 0;
  const tollsCost = Number(zone.tollsCost ?? 0);

  const preUrgency =
    baseServiceCost + mobilizationCost + operatorViaticos + tollsCost + suppliesEstimate;
  const urgencySurcharge =
    params.urgency === 'emergencia_24h' ? Math.round(baseServiceCost * 0.25) : 0;

  const subtotal = preUrgency + urgencySurcharge;
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + igv) * 100) / 100;

  return {
    baseServiceCost,
    mobilizationCost,
    operatorViaticos,
    tollsCost,
    suppliesEstimate,
    urgencySurcharge,
    subtotal,
    igv,
    total,
  };
}

export type UserRole = 'cliente' | 'administracion';

export interface PublicUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyOrFarm: string;
  documentType?: 'RUC' | 'DNI';
  rucOrDni?: string;
  role: UserRole;
  jobTitle?: string;
  basePreference?: ServiceBaseId;
  createdAt: string;
}

export interface AuthSessionResponse {
  user: PublicUserAccount;
  token: string;
}

export interface AllpaDatabase {
  products: Product[];
  orders: SparePartOrder[];
  internalRequests: InternalPartRequest[];
  serviceQuotes: ServiceQuote[];
  zoneTariffs: DistanceZoneTariff[];
  partInterests: PartInterest[];
  contactInquiries: ContactInquiry[];
}

