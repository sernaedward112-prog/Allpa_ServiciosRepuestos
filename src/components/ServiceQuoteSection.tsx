import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
  calculateServiceQuoteBreakdown,
  PERU_REGIONS,
  PREVENTIVE_TIER_MULTIPLIER,
  REQUIREMENT_OPTIONS,
  SERVICE_BASE_TARIFFS,
  type DistanceZoneId,
  type DistanceZoneTariff,
  type PreventiveTier,
  type PublicUserAccount,
  type ServiceQuote,
  type ServiceType,
} from '../shared/types';

interface ServiceQuoteSectionProps {
  zoneTariffs: DistanceZoneTariff[];
  prefillServiceType?: ServiceType | null;
  prefillRegionId?: string | null;
  prefillUrgency?: 'programado' | 'emergencia_24h' | null;
  currentUser?: PublicUserAccount | null;
  authToken?: string | null;
  onQuoteCreated: (quote: ServiceQuote) => void;
}

type MachineCategory = 'Maquinaria Agrícola' | 'Implementos Agrícolas';

const MACHINE_TYPES: MachineCategory[] = ['Maquinaria Agrícola', 'Implementos Agrícolas'];

const BRAND_MODELS_BY_TYPE: Record<MachineCategory, Record<string, string[]>> = {
  'Maquinaria Agrícola': {
    'John Deere': [
      '5075E (75 HP)',
      '5090E (90 HP)',
      '6110J (110 HP)',
      '6130J (130 HP)',
      '6403 (106 HP)',
      '7200J (200 HP)',
    ],
    'New Holland': [
      'TT4.75 (75 HP)',
      'TD5.90 (88 HP)',
      'TM7010 (110 HP)',
      'T6.130 (130 HP)',
      'T7.190 (190 HP)',
    ],
    'Massey Ferguson': [
      'MF 290 (80 HP)',
      'MF 4708 (85 HP)',
      'MF 4292 (110 HP)',
      'MF 5710 (105 HP)',
      'MF 6713 (132 HP)',
    ],
    'Case IH': [
      'Farmall 95 (95 HP)',
      'Farmall 110A (110 HP)',
      'Maxxum 135 (135 HP)',
      'Puma 155 (155 HP)',
    ],
    Kubota: ['M7060 (71 HP)', 'M9540 (95 HP)', 'M108S (108 HP)'],
    Valtra: ['A950 (95 HP)', 'BM110 (116 HP)', 'BH180 (189 HP)'],
  },
  'Implementos Agrícolas': {
    Jacto: [
      'Atomizador Arbus 2000',
      'Atomizador Arbus 4000',
      'Pulverizador Condor 800',
      'Pulverizador Advance 3000',
    ],
    Baldan: [
      'Rastra Aradora CRI 18 discos',
      'Subsolador AST/MATIC',
      'Arado de Discos AF',
    ],
    'Tatu Marchesan': [
      'Rastra Pesada GAICR',
      'Sembradora Neumática',
      'Niveladora Agrícola',
    ],
    Kuhn: [
      'Abonadora Centrífuga Axis',
      'Rotocultivador EL',
      'Pulverizador Agrícola',
    ],
    'John Deere': [
      'Sembradora de Precisión',
      'Rastra de Tiro',
      'Segadora Acondicionadora',
    ],
    'New Holland': [
      'Empacadora BC5070',
      'Segadora Discbine',
      'Cosechadora de Forraje',
    ],
  },
};

const WHATSAPP_NUMBER = '51926281039';

export function ServiceQuoteSection({
  zoneTariffs,
  prefillServiceType,
  prefillRegionId,
  prefillUrgency,
  currentUser,
  authToken,
  onQuoteCreated,
}: ServiceQuoteSectionProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [serviceType, setServiceType] = useState<ServiceType>('mantenimiento_preventivo');
  const [preventiveTier, setPreventiveTier] = useState<PreventiveTier>('500h');
  const [machineType, setMachineType] = useState<MachineCategory>('Maquinaria Agrícola');
  const [selectedBrand, setSelectedBrand] = useState<string>('John Deere');
  const [selectedModel, setSelectedModel] = useState<string>('6110J (110 HP)');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [operatingHours, setOperatingHours] = useState<number>(1250);

  const [selectedRegionId, setSelectedRegionId] = useState<string>('ica_valles');
  const [zoneId, setZoneId] = useState<DistanceZoneId>('zona_b');
  const [distanceKm, setDistanceKm] = useState<number>(75);

  const [includeOperator, setIncludeOperator] = useState<boolean>(true);
  const [urgency, setUrgency] = useState<'programado' | 'emergencia_24h'>('programado');
  const [requirementsChecklist, setRequirementsChecklist] = useState<string[]>([
    'filtros_lubricantes',
    'escaneo_ecu',
  ]);
  const [preferredDate, setPreferredDate] = useState<string>('2026-11-20');
  const [customNotes, setCustomNotes] = useState<string>('');

  const initialPersonType: 'RUC' | 'DNI' =
    currentUser?.documentType ??
    (currentUser?.rucOrDni?.replace(/\D/g, '').length === 8 ? 'DNI' : 'RUC');
  const [personType, setPersonType] = useState<'RUC' | 'DNI'>(initialPersonType);
  const [customerName, setCustomerName] = useState<string>(currentUser?.name ?? '');
  const [companyOrFarm, setCompanyOrFarm] = useState<string>(
    initialPersonType === 'RUC' && currentUser?.companyOrFarm !== 'Persona Natural'
      ? (currentUser?.companyOrFarm ?? '')
      : ''
  );
  const [phone, setPhone] = useState<string>(currentUser?.phone ?? '');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email ?? '');
  const [locationDetail, setLocationDetail] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<ServiceQuote | null>(null);

  const availableBrands = Object.keys(BRAND_MODELS_BY_TYPE[machineType]);
  const availableModels =
    selectedBrand !== 'Otra marca' ? BRAND_MODELS_BY_TYPE[machineType][selectedBrand] ?? [] : [];

  const resolvedBrand =
    selectedBrand === 'Otra marca' ? customBrand.trim() || 'Otra marca' : selectedBrand;
  const resolvedModel =
    selectedBrand === 'Otra marca' || selectedModel === 'Otro modelo'
      ? customModel.trim() || 'Modelo por especificar'
      : selectedModel;
  const machineBrandModel = `${resolvedBrand} ${resolvedModel}`.trim();

  const handleMachineTypeChange = (nextType: MachineCategory) => {
    setMachineType(nextType);
    const brands = Object.keys(BRAND_MODELS_BY_TYPE[nextType]);
    const firstBrand = brands[0];
    const firstModel = BRAND_MODELS_BY_TYPE[nextType][firstBrand][0];
    setSelectedBrand(firstBrand);
    setSelectedModel(firstModel);
    setCustomBrand('');
    setCustomModel('');
  };

  const handleBrandChange = (nextBrand: string) => {
    setSelectedBrand(nextBrand);
    if (nextBrand === 'Otra marca') {
      setSelectedModel('Otro modelo');
    } else {
      const models = BRAND_MODELS_BY_TYPE[machineType][nextBrand] ?? [];
      setSelectedModel(models[0] ?? 'Otro modelo');
    }
  };

  useEffect(() => {
    if (prefillServiceType) {
      setServiceType(prefillServiceType);
    }
    if (prefillRegionId) {
      const region = PERU_REGIONS.find((r) => r.id === prefillRegionId);
      if (region) {
        setSelectedRegionId(region.id);
        setZoneId(region.zoneId);
        setDistanceKm(region.suggestedKm);
      }
    }
    if (prefillUrgency) {
      setUrgency(prefillUrgency);
    }
  }, [prefillServiceType, prefillRegionId, prefillUrgency]);

  const selectedZone = zoneTariffs.find((z) => z.id === zoneId) ?? zoneTariffs[0];
  const selectedRegion =
    PERU_REGIONS.find((r) => r.id === selectedRegionId) ?? PERU_REGIONS[0];

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    const region = PERU_REGIONS.find((r) => r.id === regionId);
    if (region) {
      setZoneId(region.zoneId);
      setDistanceKm(region.suggestedKm);
    }
  };

  const handleZoneChange = (newZoneId: DistanceZoneId) => {
    setZoneId(newZoneId);
    const zone = zoneTariffs.find((z) => z.id === newZoneId);
    if (zone) {
      setDistanceKm(zone.defaultKm);
    }
  };

  const toggleRequirement = (reqId: string) => {
    setRequirementsChecklist((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  const breakdown = calculateServiceQuoteBreakdown({
    serviceType,
    preventiveTier: serviceType === 'mantenimiento_preventivo' ? preventiveTier : undefined,
    zoneId,
    distanceKm,
    includeOperator,
    urgency,
    requirementsChecklist,
    zones: zoneTariffs,
  });

  const buildWhatsAppLink = (quoteCode?: string) => {
    const reqNames = requirementsChecklist
      .map((id) => REQUIREMENT_OPTIONS.find((r) => r.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const lines = [
      `Hola Allpa SAC, envío mi cotización referencial web${quoteCode ? ` (${quoteCode})` : ''}:`,
      '• Salida técnica: Sede Central Ica (Cobertura Nacional)',
      `• Servicio: ${SERVICE_BASE_TARIFFS[serviceType].label}${serviceType === 'mantenimiento_preventivo' ? ` (${preventiveTier})` : ''}`,
      `• Equipo: ${machineType} — ${machineBrandModel} (${operatingHours} h)`,
      `• Región / Zona: ${selectedRegion.label} (${selectedZone.name}, ${distanceKm} km)`,
      `• Viáticos: S/ ${breakdown.operatorViaticos.toFixed(2)} · Peajes: S/ ${breakdown.tollsCost.toFixed(2)}`,
      `• Urgencia: ${urgency === 'emergencia_24h' ? 'Emergencia 24h' : 'Programado'}`,
      reqNames ? `• Requerimientos: ${reqNames}` : '',
      `• Total Referencial (inc. IGV): S/ ${breakdown.total.toFixed(2)}`,
      locationDetail ? `• Ubicación del servicio: ${locationDetail}` : '',
    ].filter(Boolean);

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (personType === 'RUC' && !companyOrFarm.trim()) {
      setErrorMessage('Ingresa el Fundo o Razón Social para la cotización con RUC.');
      return;
    }
    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const response = await fetch('/api/service-quotes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceType,
          preventiveTier: serviceType === 'mantenimiento_preventivo' ? preventiveTier : undefined,
          machineType,
          machineBrandModel,
          operatingHours,
          serviceBase: 'ica',
          regionName: selectedRegion.label,
          zoneId,
          distanceKm,
          includeOperator,
          urgency,
          requirementsChecklist,
          customNotes,
          preferredDate,
          customerName,
          companyOrFarm: personType === 'RUC' ? companyOrFarm.trim() : 'Persona Natural',
          phone,
          customerEmail,
          locationDetail,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'No se pudo registrar la cotización.');
        return;
      }

      setSubmittedQuote(data as ServiceQuote);
      onQuoteCreated(data as ServiceQuote);
    } catch {
      setErrorMessage('Error de conexión al enviar la cotización.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { num: 1 | 2 | 3; label: string }[] = [
    { num: 1, label: '1. Servicio y Equipo' },
    { num: 2, label: '2. Región y Distancia' },
    { num: 3, label: '3. Requerimientos y Envío' },
  ];

  return (
    <section className="py-12 lg:py-16 bg-white min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Marketing Header */}
        <div className="bg-[#0B2545] text-white rounded-xl p-6 sm:p-8 mb-8 border border-[#193B68]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-wide text-[#FBBF24] mb-2">
                Servicios Técnicos y Alquiler Allpa · Cobertura Nacional
              </p>
              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-balance mb-3">
                Cuéntanos tu necesidad y la resolvemos hoy.
              </h1>
              <p className="text-[#D4E0F0] text-sm sm:text-base leading-relaxed">
                Mantenimiento preventivo, correctivo, alquiler de maquinaria o repuestos.
                Diagnóstico técnico y cotización formal sin compromiso.
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 gap-2.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#12335C] rounded-lg border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                <span>Soporte técnico in situ o por evento</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#12335C] rounded-lg border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                <span>Operadores y técnicos capacitados</span>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#12335C] rounded-lg border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
                <span>Stock de repuestos de distintas marcas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Step Progress Bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {steps.map((s) => {
            const active = step === s.num;
            const completed = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0B2545] text-white border-[#0B2545]'
                    : completed
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]'
                      : 'bg-[#F4F7FB] text-[#475B75] border-[#DCE4F0] hover:border-[#93B4E8]'
                }`}
              >
                <p className="font-display text-xs sm:text-sm font-semibold truncate">{s.label}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Interactive Step Card */}
          <div className="lg:col-span-7">
            {step === 1 && (
              <div className="bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545] mb-3">
                    ¿Qué tipo de servicio necesitas?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(SERVICE_BASE_TARIFFS) as ServiceType[]).map((key) => {
                      const info = SERVICE_BASE_TARIFFS[key];
                      const selected = serviceType === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setServiceType(key)}
                          className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-white border-[#1D4ED8] ring-2 ring-[#1D4ED8]/20'
                              : 'bg-white/80 border-[#DCE4F0] hover:border-[#93B4E8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#0B2545]">
                              {info.label}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#EA580C] tabular-nums shrink-0">
                              S/ {info.baseCost}
                            </span>
                          </div>
                          <p className="text-xs text-[#475B75] leading-relaxed">
                            {info.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {serviceType === 'mantenimiento_preventivo' && (
                  <div className="pt-4 border-t border-[#DCE4F0]">
                    <p className="text-xs font-semibold text-[#0B2545] mb-2">
                      Elige la cartilla de mantenimiento preventivo:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(PREVENTIVE_TIER_MULTIPLIER) as PreventiveTier[]).map((tier) => {
                        const active = preventiveTier === tier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setPreventiveTier(tier)}
                            className={`px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#0B2545] text-white border-[#0B2545]'
                                : 'bg-white text-[#344863] border-[#DCE4F0] hover:border-[#0B2545]'
                            }`}
                          >
                            {tier.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#DCE4F0] space-y-4">
                  <p className="text-xs font-semibold text-[#0B2545]">
                    Selecciona tu tipo de maquinaria:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MACHINE_TYPES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMachineTypeChange(m)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-lg border text-left transition-colors cursor-pointer ${
                          machineType === m
                            ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                            : 'bg-white text-[#344863] border-[#DCE4F0] hover:border-[#1D4ED8]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#0B2545] mb-2">
                      Marca ({machineType === 'Maquinaria Agrícola' ? 'Tractores / Equipos' : 'Implementos'}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...availableBrands, 'Otra marca'].map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleBrandChange(brand)}
                          className={`hit-area px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            selectedBrand === brand
                              ? 'bg-[#0B2545] text-white border-[#0B2545]'
                              : 'bg-white text-[#344863] border-[#DCE4F0] hover:border-[#0B2545]'
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedBrand === 'Otra marca' && (
                    <div>
                      <label
                        htmlFor="custom-brand"
                        className="block text-xs font-semibold text-[#0B2545] mb-1"
                      >
                        Especifica la marca
                      </label>
                      <input
                        id="custom-brand"
                        type="text"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="Ej. Landini, Deutz-Fahr, Mahindra..."
                        className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="machine-model-select"
                        className="block text-xs font-semibold text-[#0B2545] mb-1"
                      >
                        Modelo de {machineType === 'Maquinaria Agrícola' ? 'tractor / equipo' : 'implemento'}
                      </label>
                      {selectedBrand !== 'Otra marca' ? (
                        <select
                          id="machine-model-select"
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white text-[#0B2545] border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                        >
                          {availableModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                          <option value="Otro modelo">Otro modelo (especificar)</option>
                        </select>
                      ) : (
                        <input
                          id="machine-model-select"
                          type="text"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="Ej. Serie o modelo exacto"
                          className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                        />
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="machine-hours"
                        className="block text-xs font-semibold text-[#0B2545] mb-1"
                      >
                        Horómetro actual (horas)
                      </label>
                      <input
                        id="machine-hours"
                        type="number"
                        min={0}
                        value={operatingHours}
                        onChange={(e) => setOperatingHours(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  </div>

                  {selectedBrand !== 'Otra marca' && selectedModel === 'Otro modelo' && (
                    <div>
                      <label
                        htmlFor="custom-model-input"
                        className="block text-xs font-semibold text-[#0B2545] mb-1"
                      >
                        Escribe el modelo exacto
                      </label>
                      <input
                        id="custom-model-input"
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="Ej. 6125M / T7.245 / Arbus 1500"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
                  >
                    <span>Siguiente: Región y Distancia</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#0B2545]">
                      ¿En qué zona del Perú está tu maquinaria?
                    </h2>
                    <p className="text-xs text-[#475B75] mt-0.5">
                      Despachamos técnicos desde nuestra Sede Central en Ica hacia todo el país.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#DCE4F0] rounded-lg text-xs font-semibold text-[#0B2545]">
                    <MapPin className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
                    <span>Salida: Sede Central Ica → Todo el Perú</span>
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#0B2545] mb-2">
                    1. Selecciona tu departamento o corredor agrícola:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PERU_REGIONS.map((region) => {
                      const active = selectedRegionId === region.id;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => handleRegionChange(region.id)}
                          className={`text-left px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                              : 'bg-white text-[#344863] border-[#DCE4F0] hover:border-[#1D4ED8]'
                          }`}
                        >
                          {region.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#0B2545] mb-2">
                    2. Tarifa por distancia desde Ica (incluye movilidad, viáticos y peajes):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {zoneTariffs.map((zone) => {
                      const selected = zoneId === zone.id;
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => handleZoneChange(zone.id)}
                          className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-white border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                              : 'bg-white/80 border-[#DCE4F0] hover:border-[#93B4E8]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#0B2545]">
                              {zone.name}
                            </span>
                            <span className="font-mono text-xs text-[#EA580C] font-semibold tabular-nums shrink-0">
                              S/ {zone.perKmRate.toFixed(2)}/km
                            </span>
                          </div>
                          <p className="text-xs text-[#475B75]">{zone.rangeLabel}</p>
                          <p className="text-[11px] font-mono text-[#0B2545] mt-1.5">
                            Viáticos: S/ {zone.operatorViaticos} · Peajes: S/ {zone.tollsCost ?? 0}
                          </p>
                          <p className="text-[11px] text-[#1D4ED8] mt-0.5 font-medium">
                            Llegada: {zone.responseWindow}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-[#DCE4F0]">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="distance-km-input"
                        className="text-xs font-semibold text-[#0B2545]"
                      >
                        Ajusta distancia exacta (km)
                      </label>
                      <span className="font-mono text-xs font-bold text-[#EA580C] tabular-nums">
                        {distanceKm} km
                      </span>
                    </div>
                    <input
                      id="distance-km-input"
                      type="range"
                      min={selectedZone.minKm}
                      max={selectedZone.maxKm}
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full accent-[#EA580C] cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-[#475B75] mt-1">
                      <span>{selectedZone.minKm} km</span>
                      <span>{selectedZone.maxKm} km</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeOperator}
                        onChange={(e) => setIncludeOperator(e.target.checked)}
                        className="mt-0.5 rounded border-[#C7D3E6] accent-[#1D4ED8]"
                      />
                      <span className="text-xs text-[#344863] leading-snug">
                        <strong className="text-[#0B2545] block">
                          Incluir traslado y viáticos de operador
                        </strong>
                        Tarifa zona: S/ {selectedZone.operatorViaticos}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUrgency('programado')}
                        className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md border cursor-pointer ${
                          urgency === 'programado'
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                        }`}
                      >
                        Programado
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgency('emergencia_24h')}
                        className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md border cursor-pointer ${
                          urgency === 'emergencia_24h'
                            ? 'bg-[#EA580C] text-white border-[#EA580C]'
                            : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                        }`}
                      >
                        Emergencia 24h (+25%)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#475B75] hover:text-[#0B2545] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Atrás</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
                  >
                    <span>Siguiente: Requerimientos y Envío</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-[#F4F7FB] border border-[#DCE4F0] rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B2545] mb-2">
                    Marca tus requerimientos técnicos y confirma
                  </h2>
                  <p className="text-xs text-[#475B75] mb-4">
                    Cada opción suma automáticamente los insumos estimados a tu cotización
                    referencial.
                  </p>

                  <div className="space-y-2">
                    {REQUIREMENT_OPTIONS.map((req) => {
                      const checked = requirementsChecklist.includes(req.id);
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => toggleRequirement(req.id)}
                          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            checked
                              ? 'bg-white border-[#1D4ED8]'
                              : 'bg-white/70 border-[#DCE4F0] hover:bg-white'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 text-xs sm:text-sm text-[#0B2545]">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                checked
                                  ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                                  : 'border-[#C7D3E6] bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" aria-hidden="true" />}
                            </span>
                            <span>{req.label}</span>
                          </span>
                          <span className="font-mono text-xs text-[#475B75] tabular-nums shrink-0">
                            + S/ {req.estimatedCost}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {submittedQuote ? (
                  <div className="bg-[#EFF6FF] border border-[#93C5FD] rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[#1D4ED8]">
                      <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <p className="font-semibold text-sm text-[#0B2545]">
                        ¡Cotización {submittedQuote.id} registrada correctamente!
                      </p>
                    </div>
                    <p className="text-xs text-[#344863] leading-relaxed">
                      Nuestro asesor recibió los datos de tu equipo, región ({submittedQuote.regionName}) y requerimientos. Enviaremos el comprobante y confirmación del servicio al correo{' '}
                      <strong className="font-mono">{submittedQuote.customerEmail}</strong>.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={buildWhatsAppLink(submittedQuote.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg"
                      >
                        <MessageCircle className="w-4 h-4" aria-hidden="true" />
                        <span>Confirmar por WhatsApp con datos precargados</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedQuote(null);
                          setStep(1);
                        }}
                        className="px-4 py-2.5 text-xs font-semibold text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg cursor-pointer"
                      >
                        Nueva cotización
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-[#DCE4F0]">
                    <p className="text-xs font-semibold text-[#0B2545]">
                      Completa tus datos para solicitar visita o cotización formal:
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPersonType('RUC')}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                          personType === 'RUC'
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-white text-[#344863] border-[#DCE4F0]'
                        }`}
                      >
                        Empresa / Fundo (RUC)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPersonType('DNI');
                          setCompanyOrFarm('');
                        }}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                          personType === 'DNI'
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-white text-[#344863] border-[#DCE4F0]'
                        }`}
                      >
                        Persona Natural (DNI)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={
                          personType === 'RUC'
                            ? 'Nombre del responsable *'
                            : 'Nombre completo (Persona Natural) *'
                        }
                        className={`w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8] ${
                          personType === 'DNI' ? 'sm:col-span-2' : ''
                        }`}
                      />
                      {personType === 'RUC' && (
                        <input
                          type="text"
                          required
                          value={companyOrFarm}
                          onChange={(e) => setCompanyOrFarm(e.target.value)}
                          placeholder="Fundo o Razón Social *"
                          className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="WhatsApp / Teléfono *"
                        className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                      <input
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Correo electrónico obligatorio (para envío de comprobante) *"
                        className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                      <input
                        type="text"
                        required
                        value={locationDetail}
                        onChange={(e) => setLocationDetail(e.target.value)}
                        placeholder="Ubicación exacta del fundo / referencia Km *"
                        className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>

                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Detalle adicional de falla o acceso al fundo (opcional)"
                      className="w-full px-3 py-2 text-sm text-[#0B2545] bg-white border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />

                    {errorMessage && (
                      <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-md">
                        {errorMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#475B75] hover:text-[#0B2545] cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        <span>Atrás</span>
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                      >
                        <Truck className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {submitting ? 'Enviando...' : 'Solicitar Visita / Cotización'}
                        </span>
                      </button>
                    </div>

                    <p className="flex items-center gap-1.5 text-[11px] text-[#475B75] pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
                      <span>Datos protegidos conforme a la Ley N.° 29733.</span>
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Sticky Live Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-[#0B2545] text-white rounded-xl p-6 sm:p-8 border border-[#193B68]">
              <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-5">
                <div>
                  <p className="text-xs text-[#FBBF24] font-semibold">
                    Precio referencial en vivo
                  </p>
                  <h3 className="font-display text-xl font-bold">
                    {SERVICE_BASE_TARIFFS[serviceType].label}
                  </h3>
                  <p className="text-xs text-[#B8C7DC] mt-0.5">
                    {machineType} · {machineBrandModel}
                  </p>
                  <p className="text-[11px] text-[#9FB3CE] mt-0.5">
                    Salida técnica: Sede Central Ica · Cobertura Nacional
                  </p>
                </div>
                <Wrench className="w-5 h-5 text-[#FBBF24] shrink-0" aria-hidden="true" />
              </div>

              <dl className="space-y-2.5 text-sm pb-5 border-b border-white/15 mb-5">
                <div className="flex items-center justify-between text-[#D4E0F0]">
                  <dt>Servicio técnico base</dt>
                  <dd className="font-mono tabular-nums">
                    S/ {breakdown.baseServiceCost.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-[#D4E0F0]">
                  <dt>
                    Movilización ({distanceKm} km · {selectedZone.name.split('—')[0]})
                  </dt>
                  <dd className="font-mono tabular-nums">
                    S/ {breakdown.mobilizationCost.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-[#D4E0F0]">
                  <dt>Viáticos de operador / técnico</dt>
                  <dd className="font-mono tabular-nums">
                    S/ {breakdown.operatorViaticos.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-[#D4E0F0]">
                  <dt>Peajes de ruta (ida y vuelta)</dt>
                  <dd className="font-mono tabular-nums">
                    S/ {breakdown.tollsCost.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-[#D4E0F0]">
                  <dt>Insumos y requerimientos ({requirementsChecklist.length})</dt>
                  <dd className="font-mono tabular-nums">
                    S/ {breakdown.suppliesEstimate.toFixed(2)}
                  </dd>
                </div>
                {breakdown.urgencySurcharge > 0 && (
                  <div className="flex items-center justify-between text-[#FBBF24]">
                    <dt>Atención de emergencia 24h</dt>
                    <dd className="font-mono tabular-nums">
                      S/ {breakdown.urgencySurcharge.toFixed(2)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#9FB3CE] pt-2 border-t border-white/10">
                  <dt>Subtotal</dt>
                  <dd className="font-mono tabular-nums">S/ {breakdown.subtotal.toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between text-[#9FB3CE]">
                  <dt>IGV (18%)</dt>
                  <dd className="font-mono tabular-nums">S/ {breakdown.igv.toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between text-lg font-bold text-white pt-2">
                  <dt>Total Referencial</dt>
                  <dd className="font-mono tabular-nums text-[#FBBF24]">
                    S/ {breakdown.total.toFixed(2)}
                  </dd>
                </div>
              </dl>

              <p className="text-[11px] text-[#B8C7DC] leading-relaxed mb-4">
                Este monto es un <strong>precio referencial</strong> automático según tu zona (
                {selectedRegion.label}). Nuestro asesor confirma la programación final contigo sin
                compromiso.
              </p>

              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Enviar resumen por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
