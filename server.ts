import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { buildSeedProducts } from './src/shared/catalogSeed.ts';
import {
  calculateServiceQuoteBreakdown,
  DISTANCE_ZONES,
  type AllpaDatabase,
  type ContactInquiry,
  type DeliveryMethod,
  type DistanceZoneId,
  type InternalPartRequest,
  type InternalRequestStatus,
  type OrderEvent,
  type OrderStatus,
  type PaymentChannel,
  type PublicOrderTracking,
  type PartInterest,
  type PreventiveTier,
  type Product,
  type ProductCategory,
  type PublicUserAccount,
  type ServiceBaseId,
  type ServiceQuote,
  type ServiceQuoteStatus,
  type ServiceType,
  type SparePartOrder,
  type UserRole,
} from './src/shared/types.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'allpa-db.json');
const AUTH_PATH = path.join(DATA_DIR, 'allpa-auth.json');

interface StoredUserRecord extends PublicUserAccount {
  passwordHash: string;
  passwordSalt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

interface AuthStore {
  users: StoredUserRecord[];
  sessions: SessionRecord[];
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function toPublicUser(user: StoredUserRecord): PublicUserAccount {
  const { passwordHash: _ph, passwordSalt: _ps, ...publicFields } = user;
  return publicFields;
}

function createSeedAuthStore(): AuthStore {
  const now = new Date().toISOString();
  const clientPass = hashPassword('Cliente2026!');
  const adminPass = hashPassword('AllpaAdmin2026!');

  return {
    users: [
      {
        id: 'usr-cliente-demo',
        name: 'Ing. Roberto Yataco',
        email: 'cliente@allpa.pe',
        phone: '956 412 880',
        companyOrFarm: 'Agrícola Santa Beatriz S.A.C.',
        documentType: 'RUC',
        rucOrDni: '20534819204',
        role: 'cliente',
        basePreference: 'ica',
        createdAt: now,
        passwordHash: clientPass.hash,
        passwordSalt: clientPass.salt,
      },
      {
        id: 'usr-admin-demo',
        name: 'Coordinación Logística Allpa',
        email: 'admin@allpa.pe',
        phone: '926 281 039',
        companyOrFarm: 'Servicios y Repuestos Allpa S.A.C.',
        documentType: 'RUC',
        rucOrDni: '20603849102',
        role: 'administracion',
        jobTitle: 'Jefatura de Logística y Operaciones',
        basePreference: 'ica',
        createdAt: now,
        passwordHash: adminPass.hash,
        passwordSalt: adminPass.salt,
      },
    ],
    sessions: [],
  };
}

function readAuthStore(): AuthStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUTH_PATH)) {
    const seed = createSeedAuthStore();
    fs.writeFileSync(AUTH_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  const raw = fs.readFileSync(AUTH_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<AuthStore>;
  if (!Array.isArray(parsed.users) || !Array.isArray(parsed.sessions)) {
    const seed = createSeedAuthStore();
    fs.writeFileSync(AUTH_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  let authMutated = false;
  for (const u of parsed.users) {
    if (u.rucOrDni && !u.documentType) {
      u.documentType = u.rucOrDni.replace(/\D/g, '').length === 11 ? 'RUC' : 'DNI';
      authMutated = true;
    }
  }
  if (authMutated) {
    fs.writeFileSync(AUTH_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
  }
  return parsed as AuthStore;
}

function writeAuthStore(store: AuthStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(AUTH_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function getAuthenticatedUser(req: Request): PublicUserAccount | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const auth = readAuthStore();
  const session = auth.sessions.find((s) => s.token === token);
  if (!session) return null;
  const user = auth.users.find((u) => u.id === session.userId);
  return user ? toPublicUser(user) : null;
}

function requireAdmin(req: Request, res: Response): PublicUserAccount | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Inicia sesión para acceder a Administración.' });
    return null;
  }
  if (user.role !== 'administracion') {
    res.status(403).json({
      error: 'Acceso restringido: esta acción pertenece únicamente al perfil de Administración.',
    });
    return null;
  }
  return user;
}

const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function isoAgo(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString();
}

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function samePhone(a: string, b: string): boolean {
  const x = digitsOnly(a).slice(-9);
  const y = digitsOnly(b).slice(-9);
  return x.length >= 9 && x === y;
}

function randomDigits(length: number): string {
  let out = String(crypto.randomInt(1, 10));
  while (out.length < length) out += String(crypto.randomInt(0, 10));
  return out;
}

function generatePaymentCode(orders: { paymentCode?: string }[]): string {
  let code = randomDigits(10);
  while (orders.some((o) => o.paymentCode === code)) code = randomDigits(10);
  return code;
}

function generateOperationNumber(orders: { operationNumber?: string }[]): string {
  let op = `OP-${randomDigits(8)}`;
  while (orders.some((o) => o.operationNumber === op)) op = `OP-${randomDigits(8)}`;
  return op;
}

function nextOrderId(orders: { id: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `PED-${year}-`;
  let max = 100;
  for (const o of orders) {
    if (o.id.startsWith(prefix)) {
      const n = Number(o.id.slice(prefix.length));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

function pushEvent(order: { events: OrderEvent[] }, title: string, detail?: string, at?: string): void {
  order.events.push({ at: at || new Date().toISOString(), title, ...(detail ? { detail } : {}) });
}

/** Datos de pago y seguimiento para los pedidos de ejemplo (estado coherente con su historia). */
function seedOrderFlow(opts: {
  channel: PaymentChannel;
  code: string;
  status: OrderStatus;
  createdAgo: number;
  paidAgo?: number;
  operationNumber?: string;
  trackingGuide?: string;
  dispatchedAgo?: number;
  deliveredAgo?: number;
  delivery: 'presencial' | 'envio';
}) {
  const createdAt = isoAgo(opts.createdAgo);
  const events: OrderEvent[] = [
    { at: createdAt, title: 'Pedido recibido', detail: 'Se generó el código de pago y se reservó el stock.' },
  ];
  const result: {
    paymentChannel: PaymentChannel;
    paymentCode: string;
    paymentDeadline: string;
    status: OrderStatus;
    events: OrderEvent[];
    createdAt: string;
    paidAt?: string;
    confirmedAt?: string;
    operationNumber?: string;
    trackingGuide?: string;
    dispatchedAt?: string;
    deliveredAt?: string;
  } = {
    paymentChannel: opts.channel,
    paymentCode: opts.code,
    paymentDeadline: new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MS).toISOString(),
    status: opts.status,
    events,
    createdAt,
  };
  if (opts.paidAgo !== undefined) {
    result.paidAt = isoAgo(opts.paidAgo);
    result.confirmedAt = result.paidAt;
    result.operationNumber = opts.operationNumber;
    events.push({ at: result.paidAt, title: 'Pago confirmado', detail: `Operación ${opts.operationNumber}.` });
  }
  if (opts.dispatchedAgo !== undefined) {
    result.dispatchedAt = isoAgo(opts.dispatchedAgo);
    result.trackingGuide = opts.trackingGuide;
    events.push({
      at: result.dispatchedAt,
      title: opts.delivery === 'envio' ? 'Pedido despachado' : 'Listo para recojo',
      detail: opts.trackingGuide ? `Guía ${opts.trackingGuide}.` : undefined,
    });
  }
  if (opts.deliveredAgo !== undefined) {
    result.deliveredAt = isoAgo(opts.deliveredAgo);
    events.push({ at: result.deliveredAt, title: 'Pedido entregado' });
  }
  return result;
}

function toPublicOrder(order: SparePartOrder): PublicOrderTracking {
  return {
    id: order.id,
    customerFirstName: (order.customerName.replace(/^(ing\.|sr\.|sra\.|dr\.)\s+/i, '').split(' ')[0] || 'Cliente'),
    items: order.items,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    shippingCarrier: order.shippingCarrier,
    shippingFee: order.shippingFee,
    subtotal: order.subtotal,
    total: order.total,
    paymentChannel: order.paymentChannel,
    paymentCode: order.paymentCode,
    paymentDeadline: order.paymentDeadline,
    operationNumber: order.operationNumber,
    paidAt: order.paidAt,
    trackingGuide: order.trackingGuide,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    status: order.status,
    events: order.events,
    createdAt: order.createdAt,
  };
}

function createSeedDatabase(): AllpaDatabase {
  const now = new Date().toISOString();
  const zoneTariffs = DISTANCE_ZONES.map((z) => ({ ...z }));

  return {
    zoneTariffs,
    products: buildSeedProducts(now),
    orders: [
      {
        id: 'PED-2026-104',
        userId: 'usr-cliente-demo',
        customerName: 'Ing. Roberto Yataco',
        companyOrFarm: 'Agrícola Santa Beatriz S.A.C.',
        rucOrDni: '20534819204',
        phone: '956 412 880',
        email: 'cliente@allpa.pe',
        items: [
          {
            productId: 'prod-1',
            sku: 'ALL-HID-1450',
            name: 'Filtro Hidráulico Alta Presión AP-H1450',
            quantity: 2,
            unitPrice: 185.0,
          },
          {
            productId: 'prod-5',
            sku: 'ALL-FIL-1473',
            name: 'Elemento Filtrante de Aire Primario + Secundario',
            quantity: 3,
            unitPrice: 135.0,
          },
        ],
        deliveryMethod: 'envio',
        deliveryAddress: 'Panamericana Sur Km 298 — Villacurí, Ica (Agencia Shalom)',
        shippingCarrier: 'Shalom / Reparto Directo Allpa',
        shippingFee: 45,
        subtotal: 775,
        total: 820,
        ...seedOrderFlow({
          channel: 'transferencia',
          code: '4829173056',
          status: 'pendiente_pago',
          createdAgo: 1000 * 60 * 95,
          delivery: 'envio',
        }),
        logisticsNotes: 'Esperando el pago del cliente.',
      },
      {
        id: 'PED-2026-103',
        customerName: 'Ing. Valeria Montes',
        companyOrFarm: 'Fundo San Isidro Agro S.A.C.',
        rucOrDni: '20601948211',
        phone: '974 221 650',
        email: 'logistica@sanisidroagro.pe',
        items: [
          {
            productId: 'prod-8',
            sku: 'ALL-HID-3120',
            name: 'Bomba Hidráulica de Engranajes 28 cc/rev',
            quantity: 1,
            unitPrice: 1680.0,
          },
          {
            productId: 'prod-7',
            sku: 'ALL-FIL-2080',
            name: 'Filtro de Aceite Motor Diésel Spin-On',
            quantity: 4,
            unitPrice: 78.0,
          },
        ],
        deliveryMethod: 'presencial',
        deliveryAddress: 'Sede Principal Allpa Ica',
        shippingCarrier: 'Recojo en Tienda / Almacén',
        shippingFee: 0,
        subtotal: 1992,
        total: 1992,
        ...seedOrderFlow({
          channel: 'qr',
          code: '7310482956',
          status: 'entregado',
          createdAgo: 1000 * 60 * 60 * 26,
          paidAgo: 1000 * 60 * 60 * 25,
          operationNumber: 'OP-88412093',
          dispatchedAgo: 1000 * 60 * 60 * 20,
          deliveredAgo: 1000 * 60 * 60 * 18,
          delivery: 'presencial',
        }),
        logisticsNotes: 'Pago verificado y entregado en mostrador Sede Ica.',
      },
      {
        id: 'PED-2026-102',
        customerName: 'Marco Antonio Silva',
        companyOrFarm: 'Agrícola Valle del Chira E.I.R.L.',
        rucOrDni: '20526410983',
        phone: '969 405 112',
        email: 'compras@vallechira.pe',
        items: [
          {
            productId: 'prod-2',
            sku: 'ALL-INY-8492',
            name: 'Inyector Diésel Common-Rail CR-8492',
            quantity: 1,
            unitPrice: 1420.0,
          },
          {
            productId: 'prod-10',
            sku: 'ALL-INY-5140',
            name: 'Filtro Separador de Agua y Combustible Racor',
            quantity: 2,
            unitPrice: 145.0,
          },
        ],
        deliveryMethod: 'envio',
        deliveryAddress: 'Av. Sánchez Cerro Km 4.5 — Base Piura / Sullana',
        shippingCarrier: 'Marvisur Expreso Norte',
        shippingFee: 45,
        subtotal: 1710,
        total: 1755,
        ...seedOrderFlow({
          channel: 'transferencia',
          code: '5602917384',
          status: 'en_despacho',
          createdAgo: 1000 * 60 * 60 * 14,
          paidAgo: 1000 * 60 * 60 * 12,
          operationNumber: 'OP-91283440',
          dispatchedAgo: 1000 * 60 * 60 * 10,
          trackingGuide: 'MV-20418835',
          delivery: 'envio',
        }),
        logisticsNotes: 'Guía emitida hacia Sullana, salida turno tarde.',
      },
      {
        id: 'PED-2026-101',
        customerName: 'Jorge Luis Espinoza',
        companyOrFarm: 'Consorcio Huaura Agro S.A.',
        rucOrDni: '20491028371',
        phone: '988 124 770',
        email: 'operaciones@huauraagro.pe',
        items: [
          {
            productId: 'prod-23',
            sku: 'ALL-HID-4680',
            name: 'Válvula de Alivio y Control de Caudal Hidráulico',
            quantity: 2,
            unitPrice: 340.0,
          },
          {
            productId: 'prod-32',
            sku: 'ALL-INY-5810',
            name: 'Solenoide de Apagado Bomba Inyectora 12V',
            quantity: 2,
            unitPrice: 175.0,
          },
        ],
        deliveryMethod: 'presencial',
        deliveryAddress: 'Base de Servicios Huacho — Panamericana Norte Km 148',
        shippingCarrier: 'Recojo en Tienda / Almacén',
        shippingFee: 0,
        subtotal: 1030,
        total: 1030,
        ...seedOrderFlow({
          channel: 'agente',
          code: '3948275016',
          status: 'pago_confirmado',
          createdAgo: 1000 * 60 * 60 * 8,
          paidAgo: 1000 * 60 * 60 * 5,
          operationNumber: 'OP-55201944',
          delivery: 'presencial',
        }),
        logisticsNotes: 'Pago confirmado. Preparar para recojo en Base Huacho.',
      },
    ],
    internalRequests: [
      {
        id: 'SOL-INT-208',
        productId: 'prod-3',
        partName: 'Kit Disco de Embrague y Freno Sinterizado',
        oemCode: 'ALL-FRE-7683 / RE238411',
        machineModel: 'Massey Ferguson 4292',
        quantityNeeded: 2,
        requesterName: 'Carlos Huamán',
        companyOrFarm: 'Fundo El Carmen Chincha',
        phone: '944 821 093',
        urgency: 'urgente_parada_maquina',
        status: 'cotizando_proveedor',
        estimatedArrival: '48 horas (Lima -> Chincha)',
        quotedUnitPrice: 890,
        notes: 'Tractor detenido en cosecha de espárrago. Priorizar envío expreso.',
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ],
    partInterests: [
      {
        id: 'INT-2026-011',
        productId: 'prod-2',
        sku: 'ALL-INY-8492',
        partName: 'Inyector Diésel Common-Rail CR-8492',
        contactNote: 'Evaluando compra de 4 unidades para flota',
        regionName: 'Ica — Pisco / Villacurí / Cañete',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
    ],
    serviceQuotes: [
      {
        id: 'COT-SRV-312',
        userId: 'usr-cliente-demo',
        serviceType: 'mantenimiento_preventivo',
        preventiveTier: '500h',
        machineType: 'Maquinaria Agrícola',
        machineBrandModel: 'John Deere 6110J',
        operatingHours: 1520,
        serviceBase: 'ica',
        regionName: 'Ica Región — Pisco / Chincha / Palpa / Nazca',
        zoneId: 'zona_b',
        distanceKm: 75,
        includeOperator: true,
        urgency: 'programado',
        requirementsChecklist: ['filtros_lubricantes', 'escaneo_ecu'],
        customNotes: 'Acceso por portón norte del fundo, coordinar con jefe de maquinaria.',
        preferredDate: '2026-11-18',
        customerName: 'Lucía Paredes',
        companyOrFarm: 'Agroexportadora Valle Verde S.A.',
        phone: '958 310 442',
        locationDetail: 'Fundo Valle Verde Lote 14, Villacurí - Ica',
        breakdown: calculateServiceQuoteBreakdown({
          serviceType: 'mantenimiento_preventivo',
          preventiveTier: '500h',
          zoneId: 'zona_b',
          distanceKm: 75,
          includeOperator: true,
          urgency: 'programado',
          requirementsChecklist: ['filtros_lubricantes', 'escaneo_ecu'],
          zones: zoneTariffs,
        }),
        finalAgreedPrice: 1710,
        status: 'operador_asignado',
        assignedOperator: 'Téc. Miguel Quispe (Sede Ica · Unidad Móvil 02)',
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
      {
        id: 'COT-SRV-311',
        serviceType: 'alquiler_con_operador',
        machineType: 'Maquinaria Agrícola',
        machineBrandModel: 'New Holland TM7010 (110 HP)',
        operatingHours: 2450,
        serviceBase: 'huacho',
        regionName: 'Lima Norte — Huacho / Huaura / Barranca / Huaral (Base Huacho)',
        zoneId: 'zona_a',
        distanceKm: 24,
        includeOperator: true,
        urgency: 'programado',
        requirementsChecklist: ['certificado_operatividad'],
        customNotes: 'Campaña de preparación de terreno para maíz amarillo.',
        preferredDate: '2026-11-16',
        customerName: 'Pedro Alarcón',
        companyOrFarm: 'Fundo Irrigación Santa Rosa',
        phone: '942 880 193',
        locationDetail: 'Irrigación Santa Rosa Parcela 22 — Huaura',
        breakdown: calculateServiceQuoteBreakdown({
          serviceType: 'alquiler_con_operador',
          zoneId: 'zona_a',
          distanceKm: 24,
          includeOperator: true,
          urgency: 'programado',
          requirementsChecklist: ['certificado_operatividad'],
          zones: zoneTariffs,
        }),
        finalAgreedPrice: 1510,
        status: 'completado',
        assignedOperator: 'Op. Raúl Chávez (Base Huacho · Tractor #04)',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
      },
      {
        id: 'COT-SRV-310',
        serviceType: 'mantenimiento_correctivo',
        machineType: 'Maquinaria Agrícola',
        machineBrandModel: 'Massey Ferguson MF 4292 (110 HP)',
        operatingHours: 3180,
        serviceBase: 'piura',
        regionName: 'Piura — Piura / Sullana / Tambogrande / Chulucanas (Base Piura)',
        zoneId: 'zona_b',
        distanceKm: 58,
        includeOperator: true,
        urgency: 'emergencia_24h',
        requirementsChecklist: ['presion_hidraulica', 'escaneo_ecu'],
        customNotes: 'Pérdida de presión en levante hidráulico durante jornada.',
        preferredDate: '2026-11-17',
        customerName: 'Elena Ramírez',
        companyOrFarm: 'Exportadora Mango del Norte S.A.C.',
        phone: '968 511 904',
        locationDetail: 'Valle San Lorenzo Km 18 — Tambogrande, Piura',
        breakdown: calculateServiceQuoteBreakdown({
          serviceType: 'mantenimiento_correctivo',
          zoneId: 'zona_b',
          distanceKm: 58,
          includeOperator: true,
          urgency: 'emergencia_24h',
          requirementsChecklist: ['presion_hidraulica', 'escaneo_ecu'],
          zones: zoneTariffs,
        }),
        status: 'en_ruta',
        assignedOperator: 'Téc. Kevin Córdova (Base Piura · Unidad Rápida 01)',
        createdAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
      },
      {
        id: 'COT-SRV-309',
        serviceType: 'diagnostico_electronico',
        machineType: 'Implementos Agrícolas',
        machineBrandModel: 'Jacto Atomizador Arbus 4000',
        operatingHours: 890,
        serviceBase: 'ica',
        regionName: 'Ica — Villacurí / Los Aquijes / Santiago (Sede Principal)',
        zoneId: 'zona_a',
        distanceKm: 18,
        includeOperator: true,
        urgency: 'programado',
        requirementsChecklist: ['calibracion_inyectores', 'escaneo_ecu'],
        customNotes: 'Calibración de caudal y revisión electrónica antes de aplicación.',
        preferredDate: '2026-11-19',
        customerName: 'Andrés Mendoza',
        companyOrFarm: 'Viñedos del Sur Ica S.R.L.',
        phone: '956 774 320',
        locationDetail: 'Subtanjalla Km 294 — Ica',
        breakdown: calculateServiceQuoteBreakdown({
          serviceType: 'diagnostico_electronico',
          zoneId: 'zona_a',
          distanceKm: 18,
          includeOperator: true,
          urgency: 'programado',
          requirementsChecklist: ['calibracion_inyectores', 'escaneo_ecu'],
          zones: zoneTariffs,
        }),
        status: 'recibida',
        assignedOperator: 'Por asignar en Logística',
        createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      },
    ],
    contactInquiries: [],
  };
}

/** Convierte pedidos guardados con el modelo anterior (depósito con N.° de operación escrito por el cliente). */
function migrateOrders(orders: SparePartOrder[]): boolean {
  let changed = false;
  const legacyStatus: Record<string, OrderStatus> = {
    esperando_confirmacion_deposito: 'pendiente_pago',
    deposito_confirmado: 'pago_confirmado',
  };
  for (const raw of orders) {
    const o = raw as SparePartOrder & {
      depositMethod?: string;
      depositOperationCode?: string;
      depositReceiptName?: string;
    };
    if (legacyStatus[o.status as string]) {
      o.status = legacyStatus[o.status as string];
      changed = true;
    }
    if (!o.paymentChannel) {
      o.paymentChannel = o.depositMethod === 'Yape Empresa' ? 'qr' : 'transferencia';
      changed = true;
    }
    if (!o.paymentCode) {
      o.paymentCode = generatePaymentCode(orders);
      changed = true;
    }
    if (!o.paymentDeadline) {
      o.paymentDeadline = new Date(new Date(o.createdAt).getTime() + PAYMENT_WINDOW_MS).toISOString();
      changed = true;
    }
    if (o.depositOperationCode !== undefined) {
      if (o.status !== 'pendiente_pago' && !o.operationNumber) o.operationNumber = o.depositOperationCode;
      delete o.depositOperationCode;
      changed = true;
    }
    if (o.depositMethod !== undefined) {
      delete o.depositMethod;
      changed = true;
    }
    if (o.depositReceiptName !== undefined) {
      delete o.depositReceiptName;
      changed = true;
    }
    if (!o.paidAt && o.confirmedAt) {
      o.paidAt = o.confirmedAt;
      changed = true;
    }
    if (!Array.isArray(o.events)) {
      o.events = [{ at: o.createdAt, title: 'Pedido recibido', detail: 'Se generó el código de pago y se reservó el stock.' }];
      if (o.paidAt) o.events.push({ at: o.paidAt, title: 'Pago confirmado', detail: o.operationNumber ? `Operación ${o.operationNumber}.` : undefined });
      changed = true;
    }
  }
  return changed;
}

/** Los códigos de pago vencidos pasan a «expirado» y el stock reservado vuelve al catálogo. */
function expirePendingOrders(db: AllpaDatabase): boolean {
  let changed = false;
  const now = Date.now();
  for (const o of db.orders) {
    if (o.status === 'pendiente_pago' && new Date(o.paymentDeadline).getTime() < now) {
      o.status = 'expirado';
      for (const item of o.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
          prod.updatedAt = new Date().toISOString();
        }
      }
      pushEvent(o, 'Código de pago vencido', 'No se registró el pago a tiempo; el stock reservado fue liberado.');
      o.logisticsNotes = 'Código de pago vencido sin pago.';
      changed = true;
    }
  }
  return changed;
}

function readDb(): AllpaDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<AllpaDatabase>;
  let mutated = false;
  const seedForSync = createSeedDatabase();
  if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
    parsed.products = seedForSync.products;
    mutated = true;
  } else {
    for (const seedProd of seedForSync.products) {
      const existing = parsed.products.find((p) => p.id === seedProd.id);
      if (!existing) {
        parsed.products.push(seedProd);
        mutated = true;
      } else if (existing.imageUrl !== seedProd.imageUrl) {
        existing.imageUrl = seedProd.imageUrl;
        mutated = true;
      }
    }
  }
  if (!Array.isArray(parsed.zoneTariffs) || parsed.zoneTariffs.length === 0) {
    parsed.zoneTariffs = DISTANCE_ZONES.map((z) => ({ ...z }));
    mutated = true;
  } else {
    for (const defaultZone of DISTANCE_ZONES) {
      const idx = parsed.zoneTariffs.findIndex((z) => z.id === defaultZone.id);
      if (idx === -1) {
        parsed.zoneTariffs.push({ ...defaultZone });
        mutated = true;
      } else {
        const current = parsed.zoneTariffs[idx];
        if (current.tollsCost === undefined || current.rangeLabel.includes('Chincha')) {
          parsed.zoneTariffs[idx] = { ...defaultZone };
          mutated = true;
        }
      }
    }
  }
  if (!Array.isArray(parsed.partInterests)) {
    parsed.partInterests = [];
    mutated = true;
  }
  if (!Array.isArray(parsed.contactInquiries)) {
    parsed.contactInquiries = [];
    mutated = true;
  }
  if (!Array.isArray(parsed.orders)) {
    parsed.orders = seedForSync.orders;
    mutated = true;
  } else if (parsed.orders.length <= 1) {
    for (const seedOrder of seedForSync.orders) {
      if (!parsed.orders.some((o) => o.id === seedOrder.id)) {
        parsed.orders.push(seedOrder);
        mutated = true;
      }
    }
  }
  if (migrateOrders(parsed.orders as SparePartOrder[])) mutated = true;
  if (!Array.isArray(parsed.serviceQuotes)) {
    parsed.serviceQuotes = seedForSync.serviceQuotes;
    mutated = true;
  } else {
    if (parsed.serviceQuotes.length <= 1) {
      for (const seedQuote of seedForSync.serviceQuotes) {
        if (!parsed.serviceQuotes.some((q) => q.id === seedQuote.id)) {
          parsed.serviceQuotes.push(seedQuote);
          mutated = true;
        }
      }
    }
    for (const q of parsed.serviceQuotes) {
      if (!q.regionName) {
        q.regionName = 'Ica — Villacurí / Los Aquijes / Santiago (Sede Principal)';
        mutated = true;
      }
      if (!q.serviceBase) {
        q.serviceBase = 'ica';
        mutated = true;
      }
      if (q.breakdown && q.breakdown.tollsCost === undefined) {
        q.breakdown.tollsCost = 0;
        mutated = true;
      }
    }
  }
  if (expirePendingOrders(parsed as AllpaDatabase)) mutated = true;
  if (mutated) {
    fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
  }
  return parsed as AllpaDatabase;
}

function writeDb(db: AllpaDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function generateCode(prefix: string): string {
  const num = Math.floor(100 + Math.random() * 899);
  return `${prefix}-${new Date().getFullYear()}-${num}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  readDb();
  readAuthStore();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Authentication & Role Separation Routes
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sesión no válida o expirada.' });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/register', (req, res) => {
    const body = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      companyOrFarm?: string;
      documentType?: 'RUC' | 'DNI';
      rucOrDni?: string;
      basePreference?: ServiceBaseId;
    };

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const phone = String(body.phone || '').trim();
    const role: UserRole = 'cliente';
    const rucOrDni = String(body.rucOrDni || '').replace(/\D/g, '').trim();
    const documentType: 'RUC' | 'DNI' =
      body.documentType === 'DNI' || (!body.documentType && rucOrDni.length === 8) ? 'DNI' : 'RUC';

    if (!name || !email || !email.includes('@') || password.length < 6 || !phone || !rucOrDni) {
      res.status(400).json({
        error:
          'Completa tu RUC o DNI, nombre, correo válido (para envío de comprobantes), teléfono y contraseña de al menos 6 caracteres.',
      });
      return;
    }

    const expectedLen = documentType === 'RUC' ? 11 : 8;
    if (rucOrDni.length !== expectedLen) {
      res.status(400).json({
        error: `El ${documentType} debe tener exactamente ${expectedLen} dígitos numéricos.`,
      });
      return;
    }

    const rawCompany = String(body.companyOrFarm || '').trim();
    if (documentType === 'RUC' && !rawCompany) {
      res.status(400).json({
        error: 'Cuando te registras con RUC, debes ingresar el Fundo o Razón Social.',
      });
      return;
    }

    const auth = readAuthStore();
    if (auth.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo electrónico.' });
      return;
    }
    if (auth.users.some((u) => (u.rucOrDni || '').replace(/\D/g, '') === rucOrDni)) {
      res.status(409).json({
        error: `Ya existe una cuenta registrada con ese número de ${documentType}. Inicia sesión.`,
      });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUserRecord = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone,
      companyOrFarm: documentType === 'RUC' ? rawCompany : 'Persona Natural',
      documentType,
      rucOrDni,
      role,
      basePreference: 'ica',
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };

    const token = crypto.randomBytes(24).toString('hex');
    auth.users.unshift(newUser);
    auth.sessions.push({
      token,
      userId: newUser.id,
      createdAt: new Date().toISOString(),
    });
    writeAuthStore(auth);

    res.status(201).json({ user: toPublicUser(newUser), token });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = req.body as {
      identifier?: string;
      rucOrDni?: string;
      password?: string;
    };
    const numericIdentifier = String(body.identifier ?? body.rucOrDni ?? '')
      .replace(/\D/g, '')
      .trim();
    const password = String(body.password || '');

    if ((numericIdentifier.length !== 8 && numericIdentifier.length !== 11) || !password) {
      res.status(400).json({
        error: 'Ingresa un RUC (11 dígitos) o DNI (8 dígitos) válido y tu contraseña.',
      });
      return;
    }

    const auth = readAuthStore();
    const user = auth.users.find(
      (u) => u.rucOrDni && u.rucOrDni.replace(/\D/g, '') === numericIdentifier
    );

    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({
        error: 'Credenciales incorrectas. Verifica tu RUC/DNI y contraseña.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    auth.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    writeAuthStore(auth);

    res.json({ user: toPublicUser(user), token });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      const auth = readAuthStore();
      auth.sessions = auth.sessions.filter((s) => s.token !== token);
      writeAuthStore(auth);
    }
    res.json({ ok: true });
  });

  app.get('/api/client/activity', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Inicia sesión para ver tu actividad de cliente.' });
      return;
    }
    const db = readDb();
    const normalizedEmail = user.email.toLowerCase();
    const normalizedPhone = user.phone.replace(/\s+/g, '');

    const orders = db.orders.filter(
      (o) =>
        o.userId === user.id ||
        (o.email && o.email.toLowerCase() === normalizedEmail) ||
        (normalizedPhone && o.phone.replace(/\s+/g, '') === normalizedPhone)
    );
    const serviceQuotes = db.serviceQuotes.filter(
      (q) =>
        q.userId === user.id ||
        (normalizedPhone && q.phone.replace(/\s+/g, '') === normalizedPhone)
    );
    const internalRequests = db.internalRequests.filter(
      (r) =>
        r.userId === user.id ||
        (normalizedPhone && r.phone.replace(/\s+/g, '') === normalizedPhone)
    );

    res.json({ orders, serviceQuotes, internalRequests });
  });

  app.get('/api/admin/overview', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    res.json(db);
  });

  app.get('/api/bootstrap', (req, res) => {
    const db = readDb();
    const authUser = getAuthenticatedUser(req);
    if (authUser?.role === 'administracion') {
      res.json(db);
      return;
    }
    res.json({
      ...db,
      orders: [],
      internalRequests: [],
      serviceQuotes: [],
      partInterests: [],
      contactInquiries: [],
    });
  });

  app.get('/api/products', (_req, res) => {
    const db = readDb();
    res.json(db.products);
  });

  app.post('/api/products', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const body = req.body as Partial<Product>;
    if (!body.name || !body.sku || body.price === undefined || body.stock === undefined) {
      res.status(400).json({ error: 'Faltan campos obligatorios del repuesto (SKU, nombre, precio, stock).' });
      return;
    }

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: String(body.sku).trim().toUpperCase(),
      name: String(body.name).trim(),
      category: (body.category as ProductCategory) || 'Filtración',
      compatibleModels: String(body.compatibleModels || 'Multimarca Agrícola').trim(),
      specs: String(body.specs || 'Repuesto estándar certificado Allpa').trim(),
      price: Math.max(1, Number(body.price)),
      stock: Math.max(0, Math.floor(Number(body.stock))),
      minStock: Math.max(1, Math.floor(Number(body.minStock ?? 3))),
      warehouseLocation: String(body.warehouseLocation || 'Almacén Principal Ica · Zona General').trim(),
      imageUrl: String(body.imageUrl || '/src/assets/images/part_hydraulic_filter_1794803509646.jpg'),
      updatedAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    writeDb(db);
    res.status(201).json(newProduct);
  });

  app.patch('/api/products/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Repuesto no encontrado.' });
      return;
    }

    const { stock, price, warehouseLocation } = req.body as {
      stock?: number;
      price?: number;
      warehouseLocation?: string;
    };

    if (stock !== undefined) {
      product.stock = Math.max(0, Math.floor(Number(stock)));
    }
    if (price !== undefined) {
      product.price = Math.max(1, Number(price));
    }
    if (warehouseLocation !== undefined) {
      product.warehouseLocation = String(warehouseLocation).trim();
    }
    product.updatedAt = new Date().toISOString();

    writeDb(db);
    res.json(product);
  });

  app.post('/api/part-interests', (req, res) => {
    const db = readDb();
    const body = req.body as {
      productId?: string;
      contactNote?: string;
      regionName?: string;
    };
    const product = db.products.find((p) => p.id === body.productId);
    if (!product) {
      res.status(404).json({ error: 'Repuesto no encontrado.' });
      return;
    }

    const entry: PartInterest = {
      id: generateCode('INT'),
      productId: product.id,
      sku: product.sku,
      partName: product.name,
      contactNote: String(body.contactNote || 'Cliente marcó interés desde catálogo web').trim(),
      regionName: String(body.regionName || 'Nacional / Web').trim(),
      createdAt: new Date().toISOString(),
    };

    db.partInterests.unshift(entry);
    writeDb(db);
    res.status(201).json(entry);
  });

  app.patch('/api/tariffs/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const zone = db.zoneTariffs.find((z) => z.id === req.params.id);
    if (!zone) {
      res.status(404).json({ error: 'Zona tarifaria no encontrada.' });
      return;
    }

    const {
      fixedOperatorDispatchFee,
      perKmRate,
      operatorViaticos,
      tollsCost,
      responseWindow,
    } = req.body as {
      fixedOperatorDispatchFee?: number;
      perKmRate?: number;
      operatorViaticos?: number;
      tollsCost?: number;
      responseWindow?: string;
    };

    if (fixedOperatorDispatchFee !== undefined) {
      zone.fixedOperatorDispatchFee = Math.max(0, Number(fixedOperatorDispatchFee));
    }
    if (perKmRate !== undefined) {
      zone.perKmRate = Math.max(0.5, Number(perKmRate));
    }
    if (operatorViaticos !== undefined) {
      zone.operatorViaticos = Math.max(0, Number(operatorViaticos));
    }
    if (tollsCost !== undefined) {
      zone.tollsCost = Math.max(0, Number(tollsCost));
    }
    if (responseWindow !== undefined) {
      zone.responseWindow = String(responseWindow).trim();
    }

    writeDb(db);
    res.json(zone);
  });

  app.get('/api/orders', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    res.json(db.orders);
  });

  // Consulta pública del estado de un pedido: se necesita el N.° de pedido (o el código de pago)
  // y el celular con el que se registró. Los intentos fallidos se limitan por IP.
  const failedTrackHits = new Map<string, { count: number; resetAt: number }>();
  const TRACK_MAX_FAILS = 12;
  const TRACK_WINDOW_MS = 10 * 60 * 1000;

  app.get('/api/orders/track', (req, res) => {
    const ip = String(req.ip || 'local');
    const now = Date.now();
    const hits = failedTrackHits.get(ip);
    if (hits && hits.resetAt > now && hits.count >= TRACK_MAX_FAILS) {
      res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' });
      return;
    }

    const ref = String(req.query.ref || '').trim();
    const phone = String(req.query.phone || '').trim();
    const db = readDb();
    const refUpper = ref.toUpperCase();
    const refDigits = digitsOnly(ref);
    const order = ref
      ? db.orders.find((o) =>
          /^[A-Z]/.test(refUpper)
            ? o.id.toUpperCase() === refUpper
            : refDigits.length >= 10 && o.paymentCode === refDigits
        )
      : undefined;

    if (!order || !samePhone(order.phone, phone)) {
      const current = hits && hits.resetAt > now ? hits : { count: 0, resetAt: now + TRACK_WINDOW_MS };
      current.count += 1;
      failedTrackHits.set(ip, current);
      res.status(404).json({
        error: 'No encontramos un pedido con esos datos. Revisa el número de pedido y el celular.',
      });
      return;
    }

    res.json({ order: toPublicOrder(order) });
  });

  app.post('/api/orders', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const db = readDb();
    const body = req.body as {
      customerName?: string;
      companyOrFarm?: string;
      rucOrDni?: string;
      phone?: string;
      email?: string;
      items?: { productId: string; quantity: number }[];
      deliveryMethod?: DeliveryMethod;
      deliveryAddress?: string;
      shippingCarrier?: string;
      paymentChannel?: PaymentChannel;
    };

    if (
      !body.customerName ||
      !body.phone ||
      !body.rucOrDni ||
      !body.email ||
      !body.email.includes('@') ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      res.status(400).json({
        error:
          'Completa tus datos (RUC/DNI, celular y correo electrónico) y los productos del carrito.',
      });
      return;
    }
    if (digitsOnly(body.phone).length < 9) {
      res.status(400).json({ error: 'Ingresa un celular de 9 dígitos para seguir tu pedido.' });
      return;
    }

    const deliveryMethod: DeliveryMethod = body.deliveryMethod === 'envio' ? 'envio' : 'presencial';
    if (deliveryMethod === 'envio' && (!body.deliveryAddress || !body.deliveryAddress.trim())) {
      res.status(400).json({ error: 'Ingresa la dirección de envío o agencia de transporte.' });
      return;
    }
    const paymentChannel: PaymentChannel =
      body.paymentChannel === 'transferencia' || body.paymentChannel === 'agente'
        ? body.paymentChannel
        : 'qr';

    const resolvedItems: SparePartOrder['items'] = [];
    for (const reqItem of body.items) {
      const product = db.products.find((p) => p.id === reqItem.productId);
      const qty = Math.floor(Number(reqItem.quantity));
      if (!product || qty <= 0) {
        res.status(400).json({ error: 'Uno de los productos seleccionados no es válido.' });
        return;
      }
      if (product.stock < qty) {
        res.status(409).json({
          error: `Stock insuficiente para ${product.name}. Disponible real: ${product.stock} und.`,
        });
        return;
      }
      resolvedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
      });
    }

    for (const item of resolvedItems) {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        product.updatedAt = new Date().toISOString();
      }
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const shippingFee = deliveryMethod === 'envio' ? 45 : 0;
    const total = Math.round((subtotal + shippingFee) * 100) / 100;

    const cleanDoc = body.rucOrDni.replace(/\D/g, '');
    const createdAt = new Date().toISOString();
    const order: SparePartOrder = {
      id: nextOrderId(db.orders),
      userId: authUser?.id,
      customerName: body.customerName.trim(),
      companyOrFarm:
        cleanDoc.length === 11
          ? (body.companyOrFarm || 'Empresa / Fundo').trim()
          : 'Persona Natural',
      rucOrDni: body.rucOrDni.trim(),
      phone: body.phone.trim(),
      email: (body.email || '').trim(),
      items: resolvedItems,
      deliveryMethod,
      deliveryAddress:
        deliveryMethod === 'presencial'
          ? String(body.deliveryAddress || 'Recojo en Sede Central Allpa Ica').trim()
          : String(body.deliveryAddress).trim(),
      shippingCarrier:
        deliveryMethod === 'presencial'
          ? 'Recojo en Punto Allpa'
          : String(body.shippingCarrier || 'Shalom / Agencia Regional').trim(),
      shippingFee,
      subtotal,
      total,
      paymentChannel,
      paymentCode: generatePaymentCode(db.orders),
      paymentDeadline: new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MS).toISOString(),
      status: 'pendiente_pago',
      events: [],
      logisticsNotes: 'Esperando el pago del cliente.',
      createdAt,
    };
    pushEvent(order, 'Pedido recibido', 'Se generó el código de pago y se reservó el stock.', createdAt);

    db.orders.unshift(order);
    writeDb(db);
    res.status(201).json({ order, products: db.products });
  });

  // Avance permitido del pedido; el administrador solo puede pasar al siguiente paso o anularlo.
  const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pendiente_pago: ['pago_confirmado', 'observado'],
    pago_confirmado: ['en_despacho', 'entregado', 'observado'],
    en_despacho: ['entregado', 'observado'],
    entregado: [],
    observado: [],
    expirado: ['pago_confirmado'],
  };

  app.patch('/api/orders/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado.' });
      return;
    }

    const { status, logisticsNotes, trackingGuide, shippingCarrier } = req.body as {
      status?: OrderStatus;
      logisticsNotes?: string;
      trackingGuide?: string;
      shippingCarrier?: string;
    };

    const previousStatus = order.status;
    const nowIso = new Date().toISOString();

    if (status && status !== previousStatus) {
      if (!ORDER_TRANSITIONS[previousStatus]?.includes(status)) {
        res.status(409).json({ error: 'Ese cambio de estado no corresponde al avance del pedido.' });
        return;
      }

      // Un pedido vencido vuelve a reservar stock si se registra un pago tardío.
      if (previousStatus === 'expirado' && status === 'pago_confirmado') {
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (!prod || prod.stock < item.quantity) {
            res.status(409).json({
              error: `No hay stock suficiente de ${item.name} para reactivar el pedido.`,
            });
            return;
          }
        }
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stock -= item.quantity;
            prod.updatedAt = nowIso;
          }
        }
      }

      if (status === 'pago_confirmado') {
        order.paidAt = nowIso;
        order.confirmedAt = nowIso;
        order.operationNumber = generateOperationNumber(db.orders);
        pushEvent(order, 'Pago confirmado', `Operación ${order.operationNumber}.`, nowIso);
      } else if (status === 'en_despacho') {
        order.dispatchedAt = nowIso;
        if (shippingCarrier && shippingCarrier.trim()) order.shippingCarrier = shippingCarrier.trim();
        if (trackingGuide && trackingGuide.trim()) order.trackingGuide = trackingGuide.trim();
        if (order.deliveryMethod === 'envio') {
          const parts = [order.shippingCarrier, order.trackingGuide ? `guía ${order.trackingGuide}` : '']
            .filter(Boolean)
            .join(' · ');
          pushEvent(order, 'Pedido despachado', parts || undefined, nowIso);
        } else {
          pushEvent(order, 'Listo para recojo', order.deliveryAddress, nowIso);
        }
      } else if (status === 'entregado') {
        order.deliveredAt = nowIso;
        pushEvent(order, 'Pedido entregado', undefined, nowIso);
      } else if (status === 'observado') {
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stock += item.quantity;
            prod.updatedAt = nowIso;
          }
        }
        pushEvent(order, 'Pedido anulado', undefined, nowIso);
      }
      order.status = status;
    } else if (order.status === 'en_despacho') {
      // Con el pedido ya despachado se puede corregir la agencia o la guía.
      if (shippingCarrier && shippingCarrier.trim()) order.shippingCarrier = shippingCarrier.trim();
      if (trackingGuide && trackingGuide.trim() && trackingGuide.trim() !== order.trackingGuide) {
        order.trackingGuide = trackingGuide.trim();
        pushEvent(order, 'Guía actualizada', `${order.shippingCarrier} · guía ${order.trackingGuide}`, nowIso);
      }
    }

    if (logisticsNotes !== undefined) {
      order.logisticsNotes = String(logisticsNotes).trim();
    }

    writeDb(db);
    res.json({ order, products: db.products });
  });

  app.get('/api/internal-requests', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    res.json(db.internalRequests);
  });

  app.post('/api/internal-requests', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const db = readDb();
    const body = req.body as Partial<InternalPartRequest>;
    if (!body.partName || !body.requesterName || !body.phone || !body.quantityNeeded) {
      res.status(400).json({ error: 'Completa el nombre del repuesto, cantidad y datos de contacto.' });
      return;
    }

    const requestItem: InternalPartRequest = {
      id: generateCode('SOL-INT'),
      userId: authUser?.id,
      productId: body.productId,
      partName: String(body.partName).trim(),
      oemCode: String(body.oemCode || 'Por confirmar').trim(),
      machineModel: String(body.machineModel || 'No especificado').trim(),
      quantityNeeded: Math.max(1, Math.floor(Number(body.quantityNeeded))),
      requesterName: String(body.requesterName).trim(),
      companyOrFarm: String(body.companyOrFarm || 'Persona Natural').trim(),
      phone: String(body.phone).trim(),
      urgency: body.urgency === 'urgente_parada_maquina' ? 'urgente_parada_maquina' : 'normal',
      status: 'pendiente_logistica',
      estimatedArrival: 'Por confirmar con almacén central',
      notes: String(body.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    db.internalRequests.unshift(requestItem);
    writeDb(db);
    res.status(201).json(requestItem);
  });

  app.patch('/api/internal-requests/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const requestItem = db.internalRequests.find((r) => r.id === req.params.id);
    if (!requestItem) {
      res.status(404).json({ error: 'Solicitud interna no encontrada.' });
      return;
    }

    const { status, estimatedArrival, quotedUnitPrice, notes, replenishStock } = req.body as {
      status?: InternalRequestStatus;
      estimatedArrival?: string;
      quotedUnitPrice?: number;
      notes?: string;
      replenishStock?: number;
    };

    if (status) requestItem.status = status;
    if (estimatedArrival !== undefined) requestItem.estimatedArrival = String(estimatedArrival).trim();
    if (quotedUnitPrice !== undefined) requestItem.quotedUnitPrice = Number(quotedUnitPrice);
    if (notes !== undefined) requestItem.notes = String(notes).trim();

    if (replenishStock && replenishStock > 0 && requestItem.productId) {
      const prod = db.products.find((p) => p.id === requestItem.productId);
      if (prod) {
        prod.stock += Math.floor(Number(replenishStock));
        prod.updatedAt = new Date().toISOString();
      }
    }

    writeDb(db);
    res.json({ internalRequest: requestItem, products: db.products });
  });

  app.get('/api/service-quotes', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    res.json(db.serviceQuotes);
  });

  app.post('/api/service-quotes', (req, res) => {
    const authUser = getAuthenticatedUser(req);
    const db = readDb();
    const body = req.body as {
      serviceType?: ServiceType;
      preventiveTier?: PreventiveTier;
      machineType?: string;
      machineBrandModel?: string;
      operatingHours?: number;
      serviceBase?: ServiceBaseId;
      regionName?: string;
      zoneId?: DistanceZoneId;
      distanceKm?: number;
      includeOperator?: boolean;
      urgency?: 'programado' | 'emergencia_24h';
      requirementsChecklist?: string[];
      customNotes?: string;
      preferredDate?: string;
      customerName?: string;
      companyOrFarm?: string;
      phone?: string;
      customerEmail?: string;
      locationDetail?: string;
    };

    if (
      !body.serviceType ||
      !body.zoneId ||
      !body.customerName ||
      !body.phone ||
      !body.customerEmail ||
      !body.customerEmail.includes('@') ||
      !body.locationDetail
    ) {
      res.status(400).json({
        error:
          'Completa el tipo de servicio, distancia, correo electrónico (para envío de comprobante), ubicación del fundo y teléfono de contacto.',
      });
      return;
    }

    const breakdown = calculateServiceQuoteBreakdown({
      serviceType: body.serviceType,
      preventiveTier: body.preventiveTier,
      zoneId: body.zoneId,
      distanceKm: Number(body.distanceKm) || 20,
      includeOperator: body.includeOperator ?? true,
      urgency: body.urgency === 'emergencia_24h' ? 'emergencia_24h' : 'programado',
      requirementsChecklist: Array.isArray(body.requirementsChecklist) ? body.requirementsChecklist : [],
      zones: db.zoneTariffs,
    });

    const quote: ServiceQuote = {
      id: generateCode('COT-SRV'),
      userId: authUser?.id,
      serviceType: body.serviceType,
      preventiveTier: body.preventiveTier,
      machineType: String(body.machineType || 'Maquinaria Agrícola').trim(),
      machineBrandModel: String(body.machineBrandModel || 'Por especificar').trim(),
      operatingHours: Math.max(0, Number(body.operatingHours) || 0),
      serviceBase: 'ica',
      regionName: String(body.regionName || 'Ica — Sede Central').trim(),
      zoneId: body.zoneId,
      distanceKm: Math.max(1, Number(body.distanceKm) || 20),
      includeOperator: body.includeOperator ?? true,
      urgency: body.urgency === 'emergencia_24h' ? 'emergencia_24h' : 'programado',
      requirementsChecklist: Array.isArray(body.requirementsChecklist) ? body.requirementsChecklist : [],
      customNotes: String(body.customNotes || '').trim(),
      preferredDate: String(body.preferredDate || new Date().toISOString().slice(0, 10)),
      customerName: body.customerName.trim(),
      companyOrFarm: String(body.companyOrFarm || 'Persona Natural').trim(),
      phone: body.phone.trim(),
      customerEmail: body.customerEmail.trim().toLowerCase(),
      locationDetail: body.locationDetail.trim(),
      breakdown,
      status: 'recibida',
      assignedOperator: 'Por asignar en Logística',
      createdAt: new Date().toISOString(),
    };

    db.serviceQuotes.unshift(quote);
    writeDb(db);
    res.status(201).json(quote);
  });

  app.patch('/api/service-quotes/:id', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    const quote = db.serviceQuotes.find((q) => q.id === req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Cotización no encontrada.' });
      return;
    }

    const { status, assignedOperator, finalAgreedPrice } = req.body as {
      status?: ServiceQuoteStatus;
      assignedOperator?: string;
      finalAgreedPrice?: number;
    };

    if (status) quote.status = status;
    if (assignedOperator !== undefined) quote.assignedOperator = String(assignedOperator).trim();
    if (finalAgreedPrice !== undefined && !Number.isNaN(Number(finalAgreedPrice))) {
      quote.finalAgreedPrice = Math.max(0, Number(finalAgreedPrice));
    }

    writeDb(db);
    res.json(quote);
  });

  app.get('/api/contact-inquiries', (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const db = readDb();
    res.json(db.contactInquiries);
  });

  app.post('/api/contact-inquiries', (req, res) => {
    const db = readDb();
    const body = req.body as Partial<ContactInquiry>;

    if (!body.name || !body.email || !body.subject || !body.message) {
      res.status(400).json({
        error: 'Completa tu nombre, correo electrónico, asunto y consulta.',
      });
      return;
    }

    const inquiry: ContactInquiry = {
      id: generateCode('CONS'),
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone || '').trim(),
      serviceBase: 'ica',
      subject: String(body.subject).trim(),
      message: String(body.message).trim(),
      recipientEmail: 'contacto@allpa.pe',
      createdAt: new Date().toISOString(),
    };

    db.contactInquiries.unshift(inquiry);
    writeDb(db);
    res.status(201).json(inquiry);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Allpa server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
