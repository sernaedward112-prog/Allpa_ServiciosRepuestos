import {
  Building2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AuthSessionResponse } from '../shared/types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthenticated: (session: AuthSessionResponse, rememberSession: boolean) => void;
}

type DocumentType = 'RUC' | 'DNI';

export function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login fields: RUC or DNI only
  const [loginDocType, setLoginDocType] = useState<DocumentType>('RUC');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [rememberSession, setRememberSession] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Client Registration fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [companyOrFarm, setCompanyOrFarm] = useState<string>('');
  const [registerDocType, setRegisterDocType] = useState<DocumentType>('RUC');
  const [rucOrDni, setRucOrDni] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginDocTypeChange = (nextDoc: DocumentType) => {
    setLoginDocType(nextDoc);
    setLoginIdentifier('');
    setErrorMessage(null);
  };

  const handleRegisterDocTypeChange = (nextDoc: DocumentType) => {
    setRegisterDocType(nextDoc);
    setRucOrDni('');
    if (nextDoc === 'DNI') {
      setCompanyOrFarm('');
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'login') {
      const cleanId = loginIdentifier.replace(/\D/g, '');
      const expectedLen = loginDocType === 'RUC' ? 11 : 8;
      if (cleanId.length !== expectedLen) {
        setErrorMessage(`El ${loginDocType} debe tener exactamente ${expectedLen} dígitos numéricos.`);
        return;
      }
    } else {
      const cleanDoc = rucOrDni.replace(/\D/g, '');
      const expectedLen = registerDocType === 'RUC' ? 11 : 8;
      if (cleanDoc.length !== expectedLen) {
        setErrorMessage(
          `El ${registerDocType} debe tener exactamente ${expectedLen} dígitos numéricos.`
        );
        return;
      }
      if (registerDocType === 'RUC' && !companyOrFarm.trim()) {
        setErrorMessage('Ingresa el Fundo o Razón Social correspondiente al RUC.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage(
          'Ingresa un correo electrónico válido para el envío de comprobantes y confirmaciones.'
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? {
              identifier: loginIdentifier.replace(/\D/g, ''),
              password,
            }
          : {
              name,
              email,
              password,
              phone,
              companyOrFarm: registerDocType === 'RUC' ? companyOrFarm.trim() : '',
              documentType: registerDocType,
              rucOrDni: rucOrDni.replace(/\D/g, ''),
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'No se pudo completar el acceso.');
        return;
      }

      onAuthenticated(data as AuthSessionResponse, rememberSession);
      onClose();
    } catch {
      setErrorMessage('Error de conexión con el servidor de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/60 p-4 anim-fade"
    >
      <div className="bg-white border border-[#DCE4F0] rounded-xl w-full max-w-lg overflow-hidden max-h-[92dvh] flex flex-col anim-pop">
        <div className="px-6 py-4 bg-[#0B2545] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {mode === 'login' ? (
              <KeyRound className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <UserPlus className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
            )}
            <div>
              <h2 id="auth-modal-title" className="font-display text-lg font-bold">
                {mode === 'login' ? 'Iniciar Sesión · Allpa' : 'Registro de Cliente · Allpa'}
              </h2>
              <p className="text-[11px] text-[#D4E0F0]">
                {mode === 'login'
                  ? 'Ingresa con tu RUC o DNI y contraseña'
                  : 'Registra tu RUC o DNI y correo para tus comprobantes y compras'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de acceso"
            className="p-1.5 text-[#D4E0F0] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Login / Register Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#0B2545] text-white'
                  : 'text-[#475B75] hover:text-[#0B2545]'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#EA580C] text-white'
                  : 'text-[#475B75] hover:text-[#0B2545]'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' ? (
              <>
                {/* Login Identification Method: RUC or DNI ONLY */}
                <div>
                  <p className="text-xs font-semibold text-[#0B2545] mb-2">
                    Método de identificación (RUC o DNI):
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleLoginDocTypeChange('RUC')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        loginDocType === 'RUC'
                          ? 'bg-white text-[#0B2545] border border-[#C7D3E6] shadow-xs'
                          : 'text-[#475B75] hover:text-[#0B2545]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#1D4ED8]" aria-hidden="true" />
                      <span>RUC (11 dígitos)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoginDocTypeChange('DNI')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        loginDocType === 'DNI'
                          ? 'bg-white text-[#0B2545] border border-[#C7D3E6] shadow-xs'
                          : 'text-[#475B75] hover:text-[#0B2545]'
                      }`}
                    >
                      <IdCard className="w-3.5 h-3.5 text-[#1D4ED8]" aria-hidden="true" />
                      <span>DNI (8 dígitos)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    {loginDocType === 'RUC'
                      ? 'Número de RUC (11 dígitos) *'
                      : 'Número de DNI (8 dígitos) *'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={loginDocType === 'RUC' ? 11 : 8}
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder={
                      loginDocType === 'RUC' ? 'Ej. 20534819204' : 'Ej. 45891234'
                    }
                    className="w-full px-3 py-2 text-sm font-mono tracking-wide border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Registration: RUC or DNI required + Obligatory Email */}
                <div>
                  <p className="text-xs font-semibold text-[#0B2545] mb-2">
                    Documento de identidad (RUC o DNI) *:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <button
                      type="button"
                      onClick={() => handleRegisterDocTypeChange('RUC')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                        registerDocType === 'RUC'
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                      }`}
                    >
                      RUC · Empresa / Fundo (11 díg.)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegisterDocTypeChange('DNI')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer ${
                        registerDocType === 'DNI'
                          ? 'bg-[#0B2545] text-white border-[#0B2545]'
                          : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0]'
                      }`}
                    >
                      DNI · Persona Natural (8 díg.)
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={registerDocType === 'RUC' ? 11 : 8}
                    value={rucOrDni}
                    onChange={(e) => setRucOrDni(e.target.value.replace(/\D/g, ''))}
                    placeholder={
                      registerDocType === 'RUC'
                        ? 'Ingresa tu RUC de 11 dígitos'
                        : 'Ingresa tu DNI de 8 dígitos'
                    }
                    className="w-full px-3 py-2 text-sm font-mono tracking-wide border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                      {registerDocType === 'RUC'
                        ? 'Nombre del contacto *'
                        : 'Nombre completo (Persona Natural) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        registerDocType === 'RUC'
                          ? 'Ej. Ing. Luis Mendoza'
                          : 'Ej. Juan Carlos Quispe'
                      }
                      className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                      WhatsApp / Celular *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="926 281 039"
                      className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                {registerDocType === 'RUC' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                      Fundo o Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyOrFarm}
                      onChange={(e) => setCompanyOrFarm(e.target.value)}
                      placeholder="Ej. Fundo San Martín S.A.C."
                      className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                    Correo electrónico obligatorio (para envío de comprobantes y confirmaciones) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@empresa.pe"
                    className="w-full px-3 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              </>
            )}

            {/* Password Input with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-semibold text-[#0B2545] mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-3 pr-10 py-2 text-sm border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="hit-area-lg absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475B75] hover:text-[#0B2545] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Session Preference Option */}
            <label className="flex items-center gap-2 text-xs text-[#344863] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="rounded border-[#C7D3E6] accent-[#0B2545]"
              />
              <span>Mantener sesión iniciada en este dispositivo</span>
            </label>

            {errorMessage && (
              <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-lg">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting
                ? 'Procesando...'
                : mode === 'login'
                  ? 'Ingresar a mi cuenta'
                  : 'Crear mi cuenta de cliente'}
            </button>

            <p className="flex items-center gap-1.5 text-[11px] text-[#475B75]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" aria-hidden="true" />
              <span>
                Identificación segura con RUC o DNI · Protección Ley N.° 29733.
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
