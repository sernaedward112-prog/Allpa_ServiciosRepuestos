const KEY = 'allpa:ultimo-pedido';

export interface LastOrderRef {
  id: string;
  phone: string;
}

/** Guarda en este navegador el último pedido para poder reabrir su seguimiento sin volver a escribir los datos. */
export function rememberLastOrder(id: string, phone: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, phone }));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function readLastOrder(): LastOrderRef | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastOrderRef>;
    return parsed.id && parsed.phone ? { id: parsed.id, phone: parsed.phone } : null;
  } catch {
    return null;
  }
}
