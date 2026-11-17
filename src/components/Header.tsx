import { KeyRound, PackageSearch, ShoppingCart, UserCheck } from 'lucide-react';
import type { PublicUserAccount } from '../shared/types';

export type ActivePage = 'nosotros' | 'servicios' | 'repuestos' | 'cliente' | 'admin';

interface HeaderProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  cartItemCount: number;
  onOpenCart: () => void;
  currentUser: PublicUserAccount | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenTrack: () => void;
}

export function Header({
  activePage,
  onNavigate,
  cartItemCount,
  onOpenCart,
  currentUser,
  onOpenAuth,
  onOpenTrack,
}: HeaderProps) {
  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'repuestos', label: 'Repuestos' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#DCE4F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('nosotros')}
          className="font-display text-2xl font-bold tracking-tight text-[#0B2545] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EA580C]"
        >
          Allpa
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden lg:flex items-center gap-8"
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EA580C] ${
                  isActive
                    ? 'text-[#0B2545] font-semibold'
                    : 'text-[#475B75] hover:text-[#0B2545]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-[#EA580C]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Session / Account Portal + Cart action */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser?.role !== 'administracion' && (
            <button
              type="button"
              onClick={onOpenTrack}
              aria-label="Seguir mi pedido"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0B2545] hover:bg-[#F4F7FB] border border-transparent hover:border-[#DCE4F0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PackageSearch className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
              <span className="hidden lg:inline">Seguir pedido</span>
            </button>
          )}
          {currentUser ? (
            <button
              type="button"
              onClick={() =>
                onNavigate(currentUser.role === 'administracion' ? 'admin' : 'cliente')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Mi Portal · {currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2545] bg-[#F4F7FB] hover:bg-[#EAF0F8] border border-[#C7D3E6] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
              <span className="hidden sm:inline">Iniciar sesión / Registro</span>
              <span className="sm:hidden">Ingresar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Carrito, ${cartItemCount} ${cartItemCount === 1 ? 'producto' : 'productos'}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
          >
            <ShoppingCart className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
            <span className="hidden sm:inline">Carrito</span>
            <span className="font-mono tabular-nums text-xs text-[#FBBF24]">
              ({cartItemCount})
            </span>
          </button>
        </div>
      </div>

      {/* Navegación para celular: segmentada, siempre visible y con áreas de toque de 44 px */}
      <nav
        aria-label="Navegación principal"
        className="lg:hidden grid grid-cols-3 border-t border-[#E6ECF5] bg-white/95"
      >
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-11 text-sm font-medium cursor-pointer transition-colors duration-150 ${
                isActive ? 'text-[#0B2545] font-semibold' : 'text-[#475B75]'
              }`}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-[#EA580C] transition-opacity duration-150 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </header>
  );
}
