import {
  CircleDot,
  Cog,
  Droplets,
  Filter,
  Fuel,
  Sprout,
  Thermometer,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Product } from '../shared/types';

// Foto solo si el nombre del producto coincide con la pieza; si no, tarjeta de categoría.
const PHOTO_RULES: { photo: string; matches: RegExp }[] = [
  { photo: 'part_hydraulic_filter', matches: /^filtro de (retorno|aceite|transmisi)|^filtro hidr/i },
  { photo: 'part_hydraulic_pump', matches: /^bomba hidr/i },
  { photo: 'part_injector_kit', matches: /^inyector|toberas|^kit caños/i },
  { photo: 'part_fuel_separator', matches: /separador|filtro de combustible/i },
  { photo: 'part_air_filter', matches: /aire|cabina|ciclónico|cartilla/i },
  { photo: 'part_pto_gears', matches: /\bpto\b|toma de fuerza|cruceta|diferencial|piñón|sincronizador/i },
  { photo: 'part_lubricant_bucket', matches: /^balde|^refrigerante|^grasa/i },
  { photo: 'part_brake_disc', matches: /disco.*(embrague|freno)|plato presor/i },
  { photo: 'part_water_pump', matches: /^bomba de agua/i },
  { photo: 'part_radiator_thermostat', matches: /^radiador|^termostato|^tapa presurizada/i },
  { photo: 'part_alternator', matches: /^alternador/i },
  { photo: 'part_starter_motor', matches: /motor de arranque/i },
  { photo: 'part_harrow_disc', matches: /^disco (recortado|liso)/i },
  { photo: 'part_sprayer_nozzle', matches: /boquilla/i },
];

export function resolveProductPhoto(product: Product): string | null {
  const url = product.imageUrl || '';
  const rule = PHOTO_RULES.find((r) => url.includes(r.photo));
  return rule && rule.matches.test(product.name) ? url : null;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Hidráulica': Droplets,
  'Inyección': Fuel,
  'Filtración': Filter,
  'Motor y Transmisión': Cog,
  'Frenos y Embrague': CircleDot,
  'Refrigeración': Thermometer,
  'Eléctrico': Zap,
  'Implementos Agrícolas': Sprout,
  'Lubricantes y Sellos': Wrench,
};

interface ProductVisualProps {
  product: Product;
  /** Tamaño de la tarjeta: lista del catálogo o ficha ampliada. */
  size?: 'card' | 'detail';
  photoFailed?: boolean;
  onPhotoError?: () => void;
}

export function ProductVisual({ product, size = 'card', photoFailed, onPhotoError }: ProductVisualProps) {
  const photo = photoFailed ? null : resolveProductPhoto(product);
  if (photo) {
    return (
      <img
        src={photo}
        alt={`${product.name} — ${product.compatibleModels}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={onPhotoError}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-103"
      />
    );
  }

  const Icon = CATEGORY_ICONS[product.category] ?? Wrench;
  const first = product.compatibleModels.split(/[·,/]/)[0]?.trim();
  return (
    <div
      role="img"
      aria-label={`${product.category}: ${product.name}`}
      className={`relative w-full h-full flex flex-col items-center justify-center gap-3 text-center bg-linear-to-br from-[#EEF3FA] to-[#D9E4F3] ${
        size === 'detail' ? 'min-h-[220px]' : ''
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(#9FB6D6 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <span
        className={`relative flex items-center justify-center bg-white rounded-2xl shadow-[0_6px_18px_rgba(11,37,69,0.10)] border border-white ${
          size === 'detail' ? 'w-20 h-20' : 'w-16 h-16'
        }`}
      >
        <Icon className={size === 'detail' ? 'w-10 h-10 text-[#1D4ED8]' : 'w-8 h-8 text-[#1D4ED8]'} aria-hidden="true" />
      </span>
      <span className="relative flex flex-col items-center gap-0.5 px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0B2545]">
          {product.category}
        </span>
        {first && <span className="text-[11px] text-[#475B75] line-clamp-1">{first}</span>}
      </span>
      <span aria-hidden="true" className="absolute bottom-0 inset-x-0 h-1 bg-[#EA580C]/80" />
    </div>
  );
}
