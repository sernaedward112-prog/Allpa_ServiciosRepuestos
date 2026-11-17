import { ArrowRight, CheckCircle2, Compass, MapPin, Package, Tractor, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { ServiceType } from '../shared/types';

interface AboutSectionProps {
  onGoToServices: (presetService?: ServiceType) => void;
  onGoToParts: () => void;
}

type IdentityTab = 'historia' | 'mision' | 'vision';

const SERVICE_PILLARS = [
  {
    index: '01',
    kicker: 'Mantenimiento de equipos agrícolas Allpa',
    title: 'Mantenimiento de equipos agrícolas y maquinaria general',
    description:
      'Brindamos servicios de mantenimiento preventivo y correctivo con personal permanente in situ o por evento, adaptándonos a la dinámica de cada operación agrícola.',
    ctaLabel: 'Solicitar visita técnica',
    action: 'service' as const,
    presetService: 'mantenimiento_preventivo' as ServiceType,
    icon: Wrench,
  },
  {
    index: '02',
    kicker: 'Alquiler de maquinaria agrícola Allpa',
    title: 'Alquiler de maquinaria agrícola',
    description:
      'Equipos agrícolas con personal técnico y operadores capacitados según el requerimiento del cliente.',
    ctaLabel: 'Cotizar alquiler',
    action: 'service' as const,
    presetService: 'alquiler_con_operador' as ServiceType,
    icon: Tractor,
  },
  {
    index: '03',
    kicker: 'Venta de repuestos agrícolas Allpa',
    title: 'Venta de repuestos agrícolas',
    description:
      'Identificamos requerimientos eficientemente, con stock de distintas marcas para responder al mercado.',
    ctaLabel: 'Explorar repuestos',
    action: 'parts' as const,
    icon: Package,
  },
];

const COVERAGE_REGIONS = [
  {
    zone: 'Sede Central Ica (Atención Inmediata)',
    places: 'Ica, Villacurí, Pisco, Chincha, Palpa y Nazca',
    response: 'Servicios en campo el mismo día · Recojo presencial de repuestos',
  },
  {
    zone: 'Lima, Centro y Sur del Perú',
    places: 'Cañete, Lima, Huacho, Ayacucho, Arequipa, Majes y Tacna',
    response: 'Despliegue técnico desde Ica (viáticos y peajes) · Envío de repuestos',
  },
  {
    zone: 'Costa Norte, Sierra y Selva',
    places: 'Trujillo, Lambayeque, Piura, Huancayo, Cusco y San Martín',
    response: 'Cobertura técnica nacional (48 – 72 h) · Agencias Shalom / Marvisur / Olva',
  },
];

export function AboutSection({ onGoToServices, onGoToParts }: AboutSectionProps) {
  const [heroError, setHeroError] = useState(false);
  const [identityTab, setIdentityTab] = useState<IdentityTab>('historia');

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#0B2545] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-wide text-[#FBBF24] mb-4">
                Servicios y Repuestos Allpa S.A.C. · Costa, Sierra y Selva · Desde 2018
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight leading-[1.12] text-balance mb-5">
                Cuéntanos tu necesidad y la resolvemos hoy.
              </h1>
              <p className="text-[#D4E0F0] text-base sm:text-lg leading-relaxed max-w-xl mb-6">
                Mantenimiento preventivo, correctivo, alquiler de maquinaria o repuestos. Diagnóstico
                técnico y cotización formal sin compromiso.
              </p>

              <ul className="space-y-2 text-sm text-[#E2EBF7] mb-8">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                  <span>Soporte técnico in situ o por evento</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                  <span>Operadores y técnicos capacitados</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                  <span>Stock de repuestos de distintas marcas</span>
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onGoToServices('mantenimiento_preventivo')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24]"
                >
                  <span>Solicitar visita técnica</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onGoToParts}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 border border-white/25 hover:border-[#FBBF24] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Ver stock de repuestos</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="relative h-full min-h-[280px] sm:min-h-[340px] lg:min-h-[420px] rounded-xl overflow-hidden bg-[#133866] border border-white/15">
                {!heroError ? (
                  <img
                    src="/src/assets/images/hero_allpa_machinery_1794803511742.jpg"
                    alt="Técnico especialista de Allpa realizando diagnóstico electrónico a tractor agrícola en campo peruano"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#133866] to-[#0B2545]">
                    <Wrench className="w-10 h-10 text-[#FBBF24] mb-3" aria-hidden="true" />
                    <p className="font-display text-lg font-semibold text-white">
                      Servicios Técnicos en Campo — Allpa S.A.C.
                    </p>
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/85 via-[#0B2545]/20 to-transparent pointer-events-none"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <span>Sede Central Ica · Atención Técnica Nacional</span>
                  <span className="font-mono tabular-nums text-[#FBBF24] font-semibold">
                    Todo el Perú
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Intuitive 3-Step Client Guide */}
      <section className="py-10 bg-white border-b border-[#DCE4F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#1D4ED8]">Guía rápida de uso</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B2545]">
                ¿Cómo solicitar un servicio o comprar repuestos en 3 pasos?
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl space-y-1.5">
              <p className="font-mono text-xs font-bold text-[#EA580C]">PASO 1 · ELIGE</p>
              <h3 className="font-display text-base font-bold text-[#0B2545]">
                Servicio Técnico o Repuestos
              </h3>
              <p className="text-xs text-[#344863] leading-relaxed">
                En <strong>Servicios</strong> cotizas mantenimiento o alquiler indicando tu tractor/implemento; en <strong>Repuestos</strong> agregas piezas al carrito.
              </p>
            </div>
            <div className="p-5 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl space-y-1.5">
              <p className="font-mono text-xs font-bold text-[#1D4ED8]">PASO 2 · CALCULA</p>
              <h3 className="font-display text-base font-bold text-[#0B2545]">
                Viáticos desde Ica o Entrega
              </h3>
              <p className="text-xs text-[#344863] leading-relaxed">
                Los servicios salen desde Ica a cualquier punto del país con viáticos y peajes claros; en repuestos eliges recojo en punto o envío nacional.
              </p>
            </div>
            <div className="p-5 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl space-y-1.5">
              <p className="font-mono text-xs font-bold text-[#15803D]">PASO 3 · CONFIRMA</p>
              <h3 className="font-display text-base font-bold text-[#0B2545]">
                RUC / DNI y Comprobante al Correo
              </h3>
              <p className="text-xs text-[#344863] leading-relaxed">
                Ingresa con tu RUC (empresa/fundo) o DNI (persona natural) y recibe la confirmación y comprobante directo en tu correo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Marketing Pillars */}
      <section className="py-14 lg:py-16 bg-[#F4F7FB] border-b border-[#DCE4F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-wide text-[#EA580C] mb-2">
              Soluciones Integrales Allpa
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight text-balance">
              Tres líneas especializadas para mantener tu operación agrícola en marcha.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {SERVICE_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <motion.article
                  key={pillar.index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: idx * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="bg-white border border-[#DCE4F0] rounded-xl p-6 sm:p-7 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-semibold text-[#1D4ED8]">
                        {pillar.index}. {pillar.kicker}
                      </span>
                      <span className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#0B2545] leading-snug mb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#344863] leading-relaxed mb-6">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#DCE4F0]">
                    <button
                      type="button"
                      onClick={() =>
                        pillar.action === 'service'
                          ? onGoToServices(pillar.presetService)
                          : onGoToParts()
                      }
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#EA580C] rounded-lg transition-colors cursor-pointer"
                    >
                      <span>{pillar.ctaLabel}</span>
                      <ArrowRight className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Identity Explorer: Historia, Misión y Visión */}
      <section className="py-14 lg:py-16 bg-white border-b border-[#DCE4F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] mb-2">
                Nosotros · Identidad Corporativa
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight text-balance mb-4">
                Respaldo mecánico y repuestos para el agro peruano desde 2018.
              </h2>
              <p className="text-sm sm:text-base text-[#344863] leading-relaxed mb-6">
                Explora nuestra historia, misión y visión institucional.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIdentityTab('historia')}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    identityTab === 'historia'
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#0B2545] border-[#DCE4F0] hover:border-[#1D4ED8]'
                  }`}
                >
                  <span className="font-display text-sm font-semibold">01. Nuestra Historia</span>
                  <span
                    className={`font-mono text-xs ${
                      identityTab === 'historia' ? 'text-[#FBBF24]' : 'text-[#475B75]'
                    }`}
                  >
                    2018 – Hoy
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIdentityTab('mision')}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    identityTab === 'mision'
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#0B2545] border-[#DCE4F0] hover:border-[#1D4ED8]'
                  }`}
                >
                  <span className="font-display text-sm font-semibold">02. Misión</span>
                  <span
                    className={`font-mono text-xs ${
                      identityTab === 'mision' ? 'text-[#FBBF24]' : 'text-[#475B75]'
                    }`}
                  >
                    Calidad
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIdentityTab('vision')}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    identityTab === 'vision'
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#0B2545] border-[#DCE4F0] hover:border-[#1D4ED8]'
                  }`}
                >
                  <span className="font-display text-sm font-semibold">03. Visión</span>
                  <span
                    className={`font-mono text-xs ${
                      identityTab === 'vision' ? 'text-[#FBBF24]' : 'text-[#475B75]'
                    }`}
                  >
                    Liderazgo
                  </span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl p-6 sm:p-8 min-h-[270px] flex flex-col justify-between">
                {identityTab === 'historia' && (
                  <div className="space-y-4">
                    <p className="font-mono text-xs font-semibold text-[#1D4ED8]">
                      01. Nuestra Historia · Fundada en noviembre de 2018
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B2545]">
                      Nacimos en Ica para resolver paradas críticas de maquinaria en campo
                    </h3>
                    <p className="text-sm sm:text-base text-[#344863] leading-relaxed">
                      Servicios y Repuestos Allpa S.A.C. inició operaciones en nuestra sede
                      principal de Ica, atendiendo a empresas agroexportadoras que requerían
                      técnicos confiables sin mover su maquinaria agrícola fuera del fundo.
                    </p>
                    <p className="text-sm sm:text-base text-[#344863] leading-relaxed">
                      Hoy movilizamos a nuestros técnicos y unidades móviles desde nuestra sede
                      central en Ica hacia todo el país, integrando una cotización referencial
                      transparente según distancia, viáticos y peajes.
                    </p>
                  </div>
                )}

                {identityTab === 'mision' && (
                  <div className="space-y-4">
                    <p className="font-mono text-xs font-semibold text-[#EA580C]">
                      02. Misión Empresarial
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B2545]">
                      Brindar servicios de mantenimiento con los más altos estándares de calidad
                    </h3>
                    <p className="text-sm sm:text-base text-[#344863] leading-relaxed">
                      Acompañamos cada campaña agrícola con mantenimiento preventivo y correctivo
                      oportuno, alquiler de maquinaria con operadores capacitados y suministro de
                      repuestos multimarca con tarifas transparentes y entrega segura.
                    </p>
                  </div>
                )}

                {identityTab === 'vision' && (
                  <div className="space-y-4">
                    <p className="font-mono text-xs font-semibold text-[#1D4ED8]">
                      03. Visión de Futuro
                    </p>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B2545]">
                      Ser reconocidos como los mejores profesionales en mantenimiento agrícola del
                      país
                    </h3>
                    <p className="text-sm sm:text-base text-[#344863] leading-relaxed">
                      Consolidar la plataforma digital líder en el Perú para la atención técnica de
                      flotas agrícolas, uniendo respuesta inmediata en línea, trato humano
                      especializado y disponibilidad real de repuestos en todo el territorio.
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-[#DCE4F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#475B75]">
                  <span>Razón social: Servicios y Repuestos Allpa S.A.C.</span>
                  <span className="font-semibold text-[#0B2545]">
                    Atención: Costa, Sierra y Selva
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coverage Matrix */}
          <div className="mt-10 bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Compass className="w-5 h-5 text-[#EA580C]" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-[#0B2545]">
                Cobertura de atención en todo el Perú
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#DCE4F0]">
              {COVERAGE_REGIONS.map((item, idx) => (
                <div key={item.zone} className={idx > 0 ? 'pt-4 md:pt-0 md:pl-6' : ''}>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                    <span>{item.zone}</span>
                  </p>
                  <p className="text-sm text-[#0B2545] font-medium mb-1">{item.places}</p>
                  <p className="text-xs font-mono text-[#475B75]">{item.response}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

