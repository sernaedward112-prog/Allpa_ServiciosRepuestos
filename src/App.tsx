import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { AdminSection } from './components/AdminSection';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { ClientPortalSection } from './components/ClientPortalSection';
import { Footer } from './components/Footer';
import { TrackOrderModal } from './components/TrackOrderModal';
import { Header, type ActivePage } from './components/Header';
import { InternalRequestModal } from './components/InternalRequestModal';
import { PartsCatalogSection, type CartEntry } from './components/PartsCatalogSection';
import { QuickPrequalifierWidget } from './components/QuickPrequalifierWidget';
import { ServiceQuoteSection } from './components/ServiceQuoteSection';
import type {
  AllpaDatabase,
  AuthSessionResponse,
  InternalPartRequest,
  PartInterest,
  Product,
  PublicUserAccount,
  ServiceQuote,
  ServiceType,
  SparePartOrder,
} from './shared/types';

const AUTH_TOKEN_KEY = 'allpa_auth_token';

function readInitialPageFromHash(): ActivePage {
  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'servicios' ||
    hash === 'repuestos' ||
    hash === 'nosotros' ||
    hash === 'cliente' ||
    hash === 'admin'
  ) {
    return hash;
  }
  return 'nosotros';
}

export default function App() {
  const [db, setDb] = useState<AllpaDatabase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState<ActivePage>(readInitialPageFromHash);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isTrackOpen, setIsTrackOpen] = useState<boolean>(false);

  const [isInternalModalOpen, setIsInternalModalOpen] = useState<boolean>(false);
  const [internalModalProduct, setInternalModalProduct] = useState<Product | null>(null);

  const [prefillServiceType, setPrefillServiceType] = useState<ServiceType | null>(null);
  const [prefillRegionId, setPrefillRegionId] = useState<string | null>(null);
  const [prefillUrgency, setPrefillUrgency] = useState<'programado' | 'emergencia_24h' | null>(
    null
  );

  // Auth & Role Separation State (Cliente vs Administración)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return (
        window.localStorage.getItem(AUTH_TOKEN_KEY) ||
        window.sessionStorage.getItem(AUTH_TOKEN_KEY)
      );
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<PublicUserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const fetchDatabase = useCallback(async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : authToken;
    try {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const response = await fetch('/api/bootstrap', { headers });
      if (!response.ok) {
        throw new Error('No se pudo cargar la plataforma');
      }
      const data = (await response.json()) as AllpaDatabase;
      setDb(data);
      setLoadError(null);
    } catch {
      setLoadError('No se pudo conectar con el servidor de Allpa. Intenta recargar.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  // Verify persisted auth token on startup
  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      return;
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: PublicUserAccount } | null) => {
        if (data?.user) {
          setCurrentUser(data.user);
        } else {
          setAuthToken(null);
          setCurrentUser(null);
          try {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch(() => {});
  }, [authToken]);

  useEffect(() => {
    const onHashChange = () => {
      setActivePage(readInitialPageFromHash());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (page: ActivePage, presetService?: ServiceType) => {
    if (presetService) {
      setPrefillServiceType(presetService);
    }
    setActivePage(page);
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthenticated = async (
    session: AuthSessionResponse,
    rememberSession = true
  ) => {
    setAuthToken(session.token);
    setCurrentUser(session.user);
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
      if (rememberSession) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
      } else {
        window.sessionStorage.setItem(AUTH_TOKEN_KEY, session.token);
      }
    } catch {
      // ignore storage errors
    }
    await fetchDatabase(session.token);
    if (session.user.role === 'administracion') {
      handleNavigate('admin');
    } else {
      handleNavigate('cliente');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    setAuthToken(null);
    setCurrentUser(null);
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
    await fetchDatabase(null);
    if (activePage === 'admin' || activePage === 'cliente') {
      handleNavigate('nosotros');
    }
  };

  const handleAddToCart = (product: Product, addQty = 1) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + addQty);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { productId: product.id, quantity: Math.min(product.stock, addQty) }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    const product = db?.products.find((p) => p.id === productId);
    const maxStock = product?.stock ?? quantity;
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(maxStock, quantity) }
          : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleOrderCreated = (order: SparePartOrder, updatedProducts: Product[]) => {
    setCart([]);
    setDb((prev) =>
      prev
        ? {
            ...prev,
            orders: [order, ...prev.orders],
            products: updatedProducts,
          }
        : prev
    );
  };

  const handleQuoteCreated = (quote: ServiceQuote) => {
    setDb((prev) =>
      prev
        ? {
            ...prev,
            serviceQuotes: [quote, ...prev.serviceQuotes],
          }
        : prev
    );
  };

  const handleOpenInternalRequest = (product: Product | null) => {
    setInternalModalProduct(product);
    setIsInternalModalOpen(true);
  };

  const handleInternalRequestSubmitted = (reqItem: InternalPartRequest) => {
    setDb((prev) =>
      prev
        ? {
            ...prev,
            internalRequests: [reqItem, ...prev.internalRequests],
          }
        : prev
    );
  };

  const handleInterestRecorded = (interest: PartInterest) => {
    setDb((prev) =>
      prev
        ? {
            ...prev,
            partInterests: [interest, ...prev.partInterests],
          }
        : prev
    );
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F4F7FB] text-[#0B2545]">
      <Header
        activePage={activePage}
        onNavigate={(page) => handleNavigate(page)}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenTrack={() => setIsTrackOpen(true)}
      />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-6">
            <div className="h-10 w-72 bg-[#DCE4F0] rounded-lg animate-pulse" />
            <div className="h-64 w-full bg-[#DCE4F0] rounded-xl animate-pulse" />
          </div>
        ) : loadError || !db ? (
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#0B2545]">
              Error al cargar datos de Allpa
            </h1>
            <p className="text-sm text-[#475B75]">{loadError}</p>
            <button
              type="button"
              onClick={() => fetchDatabase()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] rounded-lg cursor-pointer"
            >
              Reintentar conexión
            </button>
          </div>
        ) : activePage === 'nosotros' ? (
          <AboutSection
            onGoToServices={(presetService) => handleNavigate('servicios', presetService)}
            onGoToParts={() => handleNavigate('repuestos')}
          />
        ) : activePage === 'servicios' ? (
          <ServiceQuoteSection
            zoneTariffs={db.zoneTariffs}
            prefillServiceType={prefillServiceType}
            prefillRegionId={prefillRegionId}
            prefillUrgency={prefillUrgency}
            currentUser={currentUser}
            authToken={authToken}
            onQuoteCreated={handleQuoteCreated}
          />
        ) : activePage === 'repuestos' ? (
          <PartsCatalogSection
            products={db.products}
            cart={cart}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            onRequestInternal={handleOpenInternalRequest}
            onInterestRecorded={handleInterestRecorded}
          />
        ) : activePage === 'cliente' ? (
          <ClientPortalSection
            currentUser={currentUser}
            authToken={authToken}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onNavigate={(page) => handleNavigate(page)}
          />
        ) : (
          <AdminSection
            db={db}
            currentUser={currentUser}
            authToken={authToken}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onRefreshAdminDb={() => fetchDatabase()}
            onDatabaseUpdate={(updater) =>
              setDb((prev) => (prev ? updater(prev) : prev))
            }
            onSwitchToClientView={() => handleNavigate('repuestos')}
          />
        )}
      </main>

      <Footer
        onNavigate={(page) => handleNavigate(page)}
        onOpenAuth={handleOpenAuth}
        onOpenTrack={() => setIsTrackOpen(true)}
        isAdmin={currentUser?.role === 'administracion'}
        isLoggedIn={currentUser !== null}
      />

      <TrackOrderModal isOpen={isTrackOpen} onClose={() => setIsTrackOpen(false)} />

      <CartDrawer
        key={currentUser?.id ?? 'guest-cart'}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={db?.products ?? []}
        currentUser={currentUser}
        authToken={authToken}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onOrderCreated={handleOrderCreated}
      />

      <InternalRequestModal
        key={`${internalModalProduct?.id ?? (isInternalModalOpen ? 'custom-open' : 'closed')}-${currentUser?.id ?? 'guest'}`}
        isOpen={isInternalModalOpen}
        preselectedProduct={internalModalProduct}
        currentUser={currentUser}
        authToken={authToken}
        onClose={() => setIsInternalModalOpen(false)}
        onRequestSubmitted={handleInternalRequestSubmitted}
      />

      <AuthModal
        key={`${authModalMode}-${isAuthModalOpen ? 'open' : 'closed'}`}
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      <QuickPrequalifierWidget
        onRouteToService={(regionId, urgency) => {
          setPrefillRegionId(regionId);
          setPrefillUrgency(urgency);
          handleNavigate('servicios');
        }}
        onRouteToParts={() => handleNavigate('repuestos')}
      />
    </div>
  );
}
