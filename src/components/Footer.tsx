import { ArrowRight, CheckCircle2, Mail, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ContactInquiry } from '../shared/types';
import type { ActivePage } from './Header';

interface FooterProps {
  onNavigate: (page: ActivePage) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenTrack: () => void;
  /** Quien administra no cotiza ni compra: se oculta la invitación a cotizar y los accesos de cliente. */
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}

const INSTITUTIONAL_EMAIL = 'contacto@allpa.pe';
const WHATSAPP_URL =
  'https://wa.me/51926281039?text=Hola%20Allpa%20SAC%2C%20deseo%20informaci%C3%B3n%20sobre%20servicios%20o%20repuestos.';
const FACEBOOK_URL = 'https://www.facebook.com/search/top?q=Servicios%20y%20Repuestos%20Allpa';
const TIKTOK_URL = 'https://www.tiktok.com/search?q=allpa%20maquinaria%20agricola';

export function Footer({ onNavigate, onOpenAuth, onOpenTrack, isAdmin = false, isLoggedIn = false }: FooterProps) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentInquiry, setSentInquiry] = useState<ContactInquiry | null>(null);

  const buildMailtoHref = (data: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    id?: string;
  }) => {
    const baseLabel = 'Sede Central Ica · Cobertura Nacional';
    const mailSubject = `[Consulta Web${data.id ? ` ${data.id}` : ''}] ${data.subject}`;
    const mailBody = [
      `Nombre: ${data.name}`,
      `Correo del cliente: ${data.email}`,
      `Teléfono / WhatsApp: ${data.phone || 'No especificado'}`,
      `Sede de interés: ${baseLabel}`,
      '',
      'Consulta:',
      data.message,
    ].join('\n');

    return `mailto:${INSTITUTIONAL_EMAIL}?subject=${encodeURIComponent(
      mailSubject
    )}&body=${encodeURIComponent(mailBody)}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          serviceBase: 'ica',
          subject,
          message,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'No se pudo enviar la consulta.');
        return;
      }
      setSentInquiry(data as ContactInquiry);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch {
      setErrorMsg('Error de conexión al enviar la consulta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0B2545] text-[#D4E0F0] border-t border-[#193B68]">
      {/* Marketing Callout Strip (no se muestra en el portal de administración) */}
      {!isAdmin && (
      <div className="bg-[#12335C] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold text-[#FBBF24] mb-1">
              Diagnóstico técnico y cotización formal sin compromiso
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              ¿Necesitas un técnico o un repuesto?
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('servicios')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors cursor-pointer"
            >
              <span>Cotizar servicio</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('repuestos')}
              className="px-5 py-2.5 text-sm font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg transition-colors cursor-pointer"
            >
              Ver repuestos
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Main Footer Content + Institutional Email Contact Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-10 border-b border-white/15">
          {/* Left: Company, Socials, Navigation & Locations */}
          <div
            className={`${isAdmin ? 'lg:col-span-12' : 'lg:col-span-6'} grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : ''} gap-8`}
          >
            <div className="sm:col-span-2 space-y-4">
              <p className="font-display text-xl font-bold text-white">
                Servicios y Repuestos Allpa S.A.C.
              </p>
              <p className="text-sm leading-relaxed text-[#B8C7DC] max-w-lg">
                Mantenimiento preventivo y correctivo in situ o por evento, alquiler de maquinaria
                agrícola e implementos con operadores capacitados y catálogo de repuestos con stock
                real.
              </p>

              {/* Social Media Channels: WhatsApp, Facebook, TikTok */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-[#FBBF24] mb-2.5">
                  Conecta con nuestras plataformas digitales
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp oficial de Allpa"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.77 14.01c-.24.68-1.4 1.3-1.95 1.38-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.98-1.29-4.92-4.29-5.07-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.38.79-.38.2 0 .4.01.57.02.18.01.43-.07.67.51.24.59.82 2.02.89 2.17.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.38-.45.51-.15.15-.3.31-.13.61.17.3.76 1.26 1.63 2.04 1.12 1 2.07 1.31 2.37 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.07.12.07.72-.17 1.4z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={FACEBOOK_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook oficial de Allpa"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#1460C7] rounded-lg transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3H13V9.5c0-.28.22-.5.5-.5z" />
                    </svg>
                    <span>Facebook</span>
                  </a>

                  <a
                    href={TIKTOK_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok oficial de Allpa"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0B2545] bg-white hover:bg-[#FBBF24] rounded-lg transition-all duration-150 hover:-translate-y-0.5"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.81a8.23 8.23 0 0 0 4.76 1.51V6.87c-.34 0-.67-.06-1-.18z" />
                    </svg>
                    <span>TikTok</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#FBBF24]">Navegación</p>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('nosotros')}
                    className="hit-area hover:text-white transition-colors cursor-pointer"
                  >
                    Nosotros
                  </button>
                </li>
                {!isAdmin && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('servicios')}
                      className="hit-area hover:text-white transition-colors cursor-pointer"
                    >
                      Servicios y Cotizador
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('repuestos')}
                    className="hit-area hover:text-white transition-colors cursor-pointer"
                  >
                    Catálogo de Repuestos
                  </button>
                </li>
                {!isAdmin && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenTrack}
                      className="hit-area hover:text-[#FBBF24] transition-colors cursor-pointer"
                    >
                      Seguir mi pedido
                    </button>
                  </li>
                )}
                {!isLoggedIn && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="hit-area hover:text-[#FBBF24] transition-colors cursor-pointer"
                    >
                      Iniciar sesión / Registro
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-xs font-semibold text-[#FBBF24]">
                Sede Única y Cobertura Nacional
              </p>
              <p className="text-[#B8C7DC]">
                Sede Central: Ica, Perú · Salidas técnicas y envíos a todo el país
              </p>
              <p className="text-[#B8C7DC]">
                Lun – Sáb · 07:30 a 18:00 (Emergencias 24h)
              </p>
              <p className="font-mono text-xs text-[#FBBF24]">
                WhatsApp: +51 926 281 039 · {INSTITUTIONAL_EMAIL}
              </p>
            </div>
          </div>

          {/* Right: formulario de consulta general (solo para clientes; el administrador no lo necesita) */}
          {!isAdmin && (
          <div className="lg:col-span-6">
            <div className="bg-[#12335C] border border-white/15 rounded-xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FBBF24] mb-1">
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Correo Institucional · {INSTITUTIONAL_EMAIL}</span>
                  </p>
                  <h3 className="font-display text-lg font-bold text-white">
                    Envíanos una consulta general
                  </h3>
                </div>
              </div>

              {sentInquiry ? (
                <div className="bg-[#0B2545] border border-[#FBBF24]/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Consulta {sentInquiry.id} enviada a {sentInquiry.recipientEmail}
                      </p>
                      <p className="text-xs text-[#D4E0F0] mt-1 leading-relaxed">
                        Gracias, <strong>{sentInquiry.name}</strong>. Registramos tu mensaje sobre{' '}
                        <em>{sentInquiry.subject}</em> y te responderemos al correo{' '}
                        <span className="font-mono text-[#FBBF24]">{sentInquiry.email}</span>.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href={buildMailtoHref(sentInquiry)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Abrir copia en mi app de correo</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setSentInquiry(null)}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
                    >
                      Enviar otra consulta
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nombre o empresa *"
                      aria-label="Nombre o empresa"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0B2545] text-white placeholder-[#9FB3CE] border border-white/20 rounded-lg focus:outline-none focus:border-[#FBBF24]"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Tu correo electrónico *"
                      aria-label="Tu correo electrónico"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0B2545] text-white placeholder-[#9FB3CE] border border-white/20 rounded-lg focus:outline-none focus:border-[#FBBF24]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Teléfono / WhatsApp (opcional)"
                      aria-label="Teléfono o WhatsApp"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0B2545] text-white placeholder-[#9FB3CE] border border-white/20 rounded-lg focus:outline-none focus:border-[#FBBF24]"
                    />
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Asunto de la consulta *"
                      aria-label="Asunto de la consulta"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0B2545] text-white placeholder-[#9FB3CE] border border-white/20 rounded-lg focus:outline-none focus:border-[#FBBF24]"
                    />
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu consulta general para contacto@allpa.pe *"
                    aria-label="Mensaje de consulta"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-[#0B2545] text-white placeholder-[#9FB3CE] border border-white/20 rounded-lg focus:outline-none focus:border-[#FBBF24]"
                  />

                  {errorMsg && (
                    <p className="text-xs text-[#FECACA] bg-[#7F1D1D]/60 px-3 py-1.5 rounded-md">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <a
                      href={`mailto:${INSTITUTIONAL_EMAIL}`}
                      className="hit-area text-[11px] text-[#B8C7DC] hover:text-[#FBBF24] underline underline-offset-2"
                    >
                      O escribir directo a {INSTITUTIONAL_EMAIL}
                    </a>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{submitting ? 'Enviando...' : 'Enviar a contacto@allpa.pe'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9FB3CE]">
          <p>© {new Date().getFullYear()} Servicios y Repuestos Allpa S.A.C. (allpa.pe)</p>
          <p>Protección de datos según Ley N.° 29733 · Cobertura Nacional</p>
        </div>
      </div>
    </footer>
  );
}
