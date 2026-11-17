# Allpa — Servicios y Repuestos Agrícolas

Plataforma web de Servicios y Repuestos Allpa S.A.C. (Ica) para cotizar servicios técnicos, comprar repuestos con stock real y seguir el pedido en línea.

Proyecto del curso Innovación y Transformación Digital — UTP.

## Módulos

- Cotizador de servicios por distancia y viáticos
- Catálogo de repuestos con stock en tiempo real
- Pago con código y QR, con seguimiento del pedido
- Portal del cliente y panel de administración

## Tecnologías

React 19, TypeScript, Vite, Tailwind CSS 4, Express y base de datos en JSON.

## Ejecución local

```
npm install --legacy-peer-deps
npm run dev
```

Se abre en `http://localhost:3000`. La versión estática está en `docs/index.html`.

## Cuentas de prueba

| Rol | RUC | Contraseña |
|---|---|---|
| Cliente | 20534819204 | Cliente2026! |
| Administración | 20603849102 | AllpaAdmin2026! |

## Pendiente

- Integrar una pasarela de pago real y el QR de cobro de Yape/Plin. Hoy el administrador confirma el pago.
- Envío de correos y comprobantes electrónicos (SUNAT).
