import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductVisual } from './ProductVisual';
import type { PartInterest, Product, ProductCategory } from '../shared/types';

export interface CartEntry {
  productId: string;
  quantity: number;
}

interface PartsCatalogSectionProps {
  products: Product[];
  cart: CartEntry[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onOpenCart: () => void;
  onRequestInternal: (product: Product | null) => void;
  onInterestRecorded: (interest: PartInterest) => void;
}

const CATEGORIES: ('Todos' | ProductCategory)[] = [
  'Todos',
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

export function PartsCatalogSection({
  products,
  cart,
  onAddToCart,
  onOpenCart,
  onRequestInternal,
  onInterestRecorded,
}: PartsCatalogSectionProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | ProductCategory>('Todos');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [interestedIds, setInterestedIds] = useState<Record<string, boolean>>({});
  const [busyInterestId, setBusyInterestId] = useState<string | null>(null);

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockFilter]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'Todos' || product.category === selectedCategory;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && product.stock > 0) ||
      (stockFilter === 'out_of_stock' && product.stock === 0);

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      product.name.toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q) ||
      product.compatibleModels.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q);

    return matchesCategory && matchesStock && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const getCategoryCount = (cat: 'Todos' | ProductCategory) =>
    cat === 'Todos' ? products.length : products.filter((p) => p.category === cat).length;

  const getCartQty = (productId: string) =>
    cart.find((c) => c.productId === productId)?.quantity ?? 0;

  const triggerAdd = (product: Product, qty = 1) => {
    onAddToCart(product, qty);
    setLastAddedName(`${qty}x ${product.name}`);
  };

  const openDetailModal = (product: Product) => {
    setDetailProduct(product);
    setDetailQty(1);
  };

  const handleMarkInterest = async (product: Product) => {
    if (interestedIds[product.id]) return;
    setBusyInterestId(product.id);
    try {
      const res = await fetch('/api/part-interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          contactNote: 'Clic en "Me interesa" desde catálogo web',
          regionName: 'Nacional / Web',
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as PartInterest;
        setInterestedIds((prev) => ({ ...prev, [product.id]: true }));
        onInterestRecorded(created);
      }
    } finally {
      setBusyInterestId(null);
    }
  };

  return (
    <section className="py-12 lg:py-16 bg-[#F4F7FB] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-[#EA580C] mb-2">
              E-Commerce de Repuestos · Stock Real
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#0B2545] tracking-tight text-balance mb-3">
              Catálogo de repuestos con stock disponible en línea.
            </h1>
            <p className="text-[#344863] leading-relaxed">
              Haz clic en cualquier repuesto para ver su ficha técnica, agrégalo al carrito para
              coordinar recojo presencial o envío, o usa{' '}
              <strong className="text-[#0B2545]">Me interesa</strong> si aún estás cotizando.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRequestInternal(null)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B2545] bg-white hover:bg-[#EAF0F8] border border-[#C7D3E6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
            <span>Solicitar repuesto no listado al interno</span>
          </button>
        </div>

        {/* Intuitive 3-step buyer guide */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-[#DCE4F0] rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-white bg-[#0B2545] px-2 py-1 rounded">
              1
            </span>
            <p className="text-xs text-[#344863]">
              <strong className="text-[#0B2545]">Elige tu repuesto</strong> por categoría o código OEM.
            </p>
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-white bg-[#1D4ED8] px-2 py-1 rounded">
              2
            </span>
            <p className="text-xs text-[#344863]">
              <strong className="text-[#0B2545]">Recojo o Envío:</strong> retira en punto Allpa o solicita despacho nacional.
            </p>
          </div>
          <div className="bg-white border border-[#DCE4F0] rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-white bg-[#EA580C] px-2 py-1 rounded">
              3
            </span>
            <p className="text-xs text-[#344863]">
              <strong className="text-[#0B2545]">Pago y seguimiento:</strong> recibe tu código de pago, paga con QR, transferencia o agente y sigue tu pedido en línea.
            </p>
          </div>
        </div>

        {/* Instant Cart Feedback Banner */}
        {lastAddedName && (
          <div className="mb-6 bg-[#0B2545] text-white px-5 py-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm">
              <Check className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
              <span>
                Agregado al carrito: <strong>{lastAddedName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenCart}
                className="hit-area inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#0B2545] bg-[#FBBF24] hover:bg-[#F59E0B] rounded-lg cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ver carrito y pagar</span>
              </button>
              <button
                type="button"
                onClick={() => setLastAddedName(null)}
                aria-label="Cerrar aviso"
                className="hit-area-lg p-1 text-[#B8C7DC] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#DCE4F0] rounded-xl p-4 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="w-4 h-4 text-[#475B75] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por repuesto, código SKU, marca o implemento..."
                aria-label="Buscar repuestos"
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#F4F7FB] border border-[#C7D3E6] rounded-lg focus:outline-none focus:border-[#1D4ED8] focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`hit-area px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-white text-[#0B2545] shadow-xs font-semibold'
                    : 'text-[#475B75] hover:text-[#0B2545]'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`hit-area px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  stockFilter === 'in_stock'
                    ? 'bg-white text-[#0B2545] shadow-xs font-semibold'
                    : 'text-[#475B75] hover:text-[#0B2545]'
                }`}
              >
                Con stock ({products.filter((p) => p.stock > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('out_of_stock')}
                className={`hit-area px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  stockFilter === 'out_of_stock'
                    ? 'bg-white text-[#0B2545] shadow-xs font-semibold'
                    : 'text-[#475B75] hover:text-[#0B2545]'
                }`}
              >
                Agotados ({products.filter((p) => p.stock === 0).length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              const count = getCategoryCount(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`hit-area px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-[#F4F7FB] text-[#344863] border-[#DCE4F0] hover:border-[#93B4E8]'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#DCE4F0] rounded-xl p-12 text-center">
            <Package className="w-10 h-10 text-[#475B75] mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#0B2545] mb-1">
              No encontramos repuestos con ese criterio
            </h2>
            <p className="text-sm text-[#475B75] mb-5">
              Limpia los filtros o solicita la pieza directamente a nuestro equipo interno.
            </p>
            <button
              type="button"
              onClick={() => onRequestInternal(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
            >
              <span>Solicitar al Interno</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProducts.map((product) => {
              const inCartQty = getCartQty(product.id);
              const outOfStock = product.stock === 0;
              const maxReached = inCartQty >= product.stock;
              const imgFailed = failedImages[product.id];
              const isInterested = !!interestedIds[product.id];

              return (
                <article
                  key={product.id}
                  className="bg-white border border-[#DCE4F0] rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => openDetailModal(product)}
                    className="group relative aspect-4/3 bg-[#EEF3F9] overflow-hidden border-b border-[#DCE4F0] text-left cursor-pointer"
                  >
                    <ProductVisual
                      product={product}
                      photoFailed={imgFailed}
                      onPhotoError={() =>
                        setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                      }
                    />
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#0B2545]/85 text-white rounded-md">
                      <Eye className="w-3 h-3 text-[#FBBF24]" aria-hidden="true" />
                      <span>Ver ficha</span>
                    </span>
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475B75] mb-2">
                        <span className="font-medium text-[#1D4ED8]">{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{product.sku}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openDetailModal(product)}
                        className="hit-area text-left font-display text-base font-bold text-[#0B2545] hover:text-[#1D4ED8] leading-snug mb-1.5 cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <p className="text-xs text-[#344863] mb-2">{product.compatibleModels}</p>
                      <p className="text-xs text-[#475B75] leading-relaxed">{product.specs}</p>
                    </div>

                    <div className="pt-4 border-t border-[#DCE4F0] space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <p className="font-mono text-lg font-bold text-[#0B2545] tabular-nums">
                            S/ {product.price.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-[#475B75]">{product.warehouseLocation}</p>
                        </div>

                        <div className="text-right">
                          {outOfStock ? (
                            <span className="text-xs font-semibold text-[#B91C1C]">
                              Agotado · 0 und.
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-[#1D4ED8] tabular-nums">
                              Disponible: {product.stock} und.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {outOfStock ? (
                          <button
                            type="button"
                            onClick={() => onRequestInternal(product)}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold text-[#0B2545] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] rounded-lg transition-colors cursor-pointer"
                          >
                            <ClipboardList className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                            <span>Solicitar al Interno</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={maxReached}
                            onClick={() => triggerAdd(product, 1)}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133866] disabled:bg-[#94A3B8] rounded-lg transition-colors cursor-pointer"
                          >
                            {inCartQty > 0 ? (
                              <>
                                <ShoppingBag className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                                <span>
                                  {maxReached
                                    ? `Máx. (${inCartQty})`
                                    : `En carrito (${inCartQty}) +1`}
                                </span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
                                <span>Agregar al carrito</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyInterestId === product.id || isInterested}
                          onClick={() => handleMarkInterest(product)}
                          title="Guardar interés en este repuesto"
                          className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isInterested
                              ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]'
                              : 'bg-white text-[#344863] border-[#C7D3E6] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                          }`}
                        >
                          {isInterested ? (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Registrado</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Me interesa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 bg-white border border-[#DCE4F0] rounded-xl px-5 py-3.5">
                <p className="text-xs text-[#475B75]">
                  Mostrando{' '}
                  <strong className="text-[#0B2545]">
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(safePage * ITEMS_PER_PAGE, filteredProducts.length)}
                  </strong>{' '}
                  de <strong className="text-[#0B2545]">{filteredProducts.length}</strong> repuestos
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                    className="hit-area inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0B2545] bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Anterior</span>
                  </button>

                  <span className="px-3 text-xs font-mono font-semibold text-[#0B2545]">
                    {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Siguiente página"
                    className="hit-area inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0B2545] bg-[#F4F7FB] border border-[#DCE4F0] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interactive Product Detail Modal */}
      {detailProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/55 p-4 anim-fade"
        >
          <div className="bg-white border border-[#DCE4F0] rounded-xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto grid grid-cols-1 md:grid-cols-12 anim-pop">
            <div className="md:col-span-5 bg-[#EEF3F9] border-b md:border-b-0 md:border-r border-[#DCE4F0]">
              <ProductVisual
                product={detailProduct}
                size="detail"
                photoFailed={failedImages[detailProduct.id]}
                onPhotoError={() =>
                  setFailedImages((prev) => ({ ...prev, [detailProduct.id]: true }))
                }
              />
            </div>

            <div className="md:col-span-7 p-6 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-xs text-[#475B75]">
                    <span className="font-semibold text-[#1D4ED8]">{detailProduct.category}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono">{detailProduct.sku}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailProduct(null)}
                    aria-label="Cerrar ficha técnica"
                    className="hit-area p-1 text-[#475B75] hover:text-[#0B2545] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3
                  id="detail-modal-title"
                  className="font-display text-xl font-bold text-[#0B2545] mb-2"
                >
                  {detailProduct.name}
                </h3>
                <p className="text-xs font-semibold text-[#EA580C] mb-2">
                  Compatibilidad: {detailProduct.compatibleModels}
                </p>
                <p className="text-sm text-[#344863] leading-relaxed mb-4">
                  {detailProduct.specs}
                </p>
                <p className="text-xs text-[#475B75]">
                  Ubicación: {detailProduct.warehouseLocation}
                </p>
              </div>

              <div className="pt-4 border-t border-[#DCE4F0] space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-2xl font-bold text-[#0B2545] tabular-nums">
                    S/ {detailProduct.price.toFixed(2)}
                  </p>
                  {detailProduct.stock > 0 ? (
                    <span className="text-xs font-semibold text-[#1D4ED8] tabular-nums">
                      Disponible: {detailProduct.stock} und.
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#B91C1C]">Agotado (0 und.)</span>
                  )}
                </div>

                {detailProduct.stock > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[#C7D3E6] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                        aria-label="Disminuir cantidad"
                        className="p-2 text-[#344863] hover:text-[#0B2545] cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm font-mono font-semibold tabular-nums">
                        {detailQty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailQty((q) =>
                            Math.min(
                              Math.max(1, detailProduct.stock - getCartQty(detailProduct.id)),
                              q + 1
                            )
                          )
                        }
                        aria-label="Aumentar cantidad"
                        className="p-2 text-[#344863] hover:text-[#0B2545] cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerAdd(detailProduct, detailQty);
                        setDetailProduct(null);
                      }}
                      className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg cursor-pointer"
                    >
                      Agregar al carrito
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = detailProduct;
                      setDetailProduct(null);
                      onRequestInternal(prod);
                    }}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-[#0B2545] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] rounded-lg cursor-pointer"
                  >
                    Solicitar reposición al Interno
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

