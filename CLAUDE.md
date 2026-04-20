# Sistema de Gestión de Préstamos — Proyecto

## Contexto del cliente

El cliente es un **prestamista independiente en Colombia** que presta dinero a personas y cobra diariamente. Hoy lleva sus préstamos con Excel/papel. Quiere una app móvil sencilla para apuntar préstamos y abonos, ver saldos actualizados en tiempo real, y nada más.

**Perfil del usuario final (el prestamista)**:
- Usa el celular todo el día cobrando físicamente
- No necesita que el sistema le recuerde nada — él está activo
- No necesita que envíe mensajes a los deudores
- No necesita link de pago
- NO tiene WhatsApp Business verificado — por tanto, **nada de automatizaciones de WhatsApp**
- Quiere apuntar pagos él mismo (inmutable: "anotar pero no editar")

**El prestamista es el ÚNICO usuario de la app.** Los deudores no interactúan con el sistema.

---

## Modelo de negocio del desarrollador (Crhist)

Esta app se **vende como servicio** al cliente final. Implicaciones:
- Todo el stack está bajo **control del desarrollador** (código, hosting, dominio, datos)
- El cliente solo consume la app; no accede a configuración
- Cualquier cambio lo solicita al desarrollador
- Modelo: **setup inicial + mensualidad** (hosting + soporte + ajustes menores)

Por esto se descartó AppSheet (deja el control en manos del cliente y muestra branding de Google).

---

## Alcance funcional

### 2 pantallas principales

**Pantalla 1 — Nuevo préstamo**
Un solo formulario que captura:
- Nombre del deudor
- Teléfono del deudor
- Monto total del préstamo (ya incluye capital + intereses — el cliente apunta el total junto)
- Fecha del préstamo

Lógica: si ya existe un deudor con ese teléfono → lo reutiliza (mismo deudor, nuevo préstamo). Si no existe → crea deudor + préstamo en una sola acción.

**Pantalla 2 — Préstamos activos** (la más usada)
Lista de préstamos con saldo > 0:
- Nombre del deudor
- Saldo pendiente
- Monto total original
- Días transcurridos desde el préstamo

Tap en un préstamo → vista de detalle:
- Historial de abonos previos
- Campo "Registrar abono" con botón grande
- Al registrar abono → saldo se actualiza al instante
- Cuando saldo = 0 → préstamo se archiva automáticamente (no se borra, se oculta de la lista activa)

### Reglas de negocio

- **Abonos inmutables**: una vez registrado un abono, no se puede editar ni borrar (integridad contable, fue requerimiento explícito del cliente)
- **Saldo calculado**, no almacenado: `saldo = monto_total - SUM(abonos)`
- **Multi-préstamo**: un deudor puede tener varios préstamos activos al mismo tiempo
- **Archivado automático**: cuando un préstamo llega a saldo 0, pasa a estado "pagado" y sale de la vista principal (pero queda en histórico)

---

## Stack técnico

```
Cliente (prestamista) abre la app en su celular
         │
         ▼
PWA custom (HTML + CSS + Alpine.js)
Hospedada en Vercel bajo subdominio prestamos.crhist.dev
         │
         ▼  (fetch JSON directo)
Google Apps Script Web App (doGet/doPost)
         │
         ▼
Google Sheets (en cuenta del desarrollador, NO del cliente)
```

### Decisiones de stack

| Componente | Elección | Razón |
|---|---|---|
| Frontend | PWA con HTML + CSS + Alpine.js | Ligero, sin build step, funciona offline, instalable al home screen |
| Hosting frontend | Vercel free tier | Gratis para 1 usuario, deploy automático desde Git |
| Backend | Google Apps Script (Web App) | Corre junto al Spreadsheet, una sola URL `/exec`, cero infra propia |
| Base de datos | Google Sheets | Simple para 15-50 deudores; fácil de respaldar; si escala, se migra a Supabase |
| Dominio | `prestamos.crhist.dev` (subdominio del desarrollador) | Control total, sin pagos adicionales |

**Nota histórica**: el plan original era n8n + Google Sheets (ver sección "Workflows n8n descontinuados" más abajo). Durante la construcción se pivotó a Apps Script por: menos latencia, menos piezas que pueden fallar, no depende del VPS n8n, y Apps Script puede leer/escribir el Spreadsheet directamente con `SpreadsheetApp.openById(...)`.

### Colores (diseño formal, elegido para sector financiero)

- **Primary**: `#1E3A5F` — Navy blue clásico, transmite seriedad y confianza
- **Accent**: `#C9A961` — Oro cálido para saldos y montos destacados
- **Background**: `#FAFAFA` — Off-white limpio
- **Text primary**: `#1A1A1A`
- **Text secondary**: `#6B7280`
- **Success** (pagado): `#2D6A4F` — Verde oscuro
- **Danger** (mora / saldo alto): `#8B1E1E` — Rojo oscuro vinoso
- **Divider**: `#E5E7EB`

Tipografía: Inter (via Google Fonts) — limpia y profesional.

### Nombre de la app

**Contabilidad Mobile Solution** (rebrand definido por el cliente el 2026-04-19). Logo: silver/chrome circular. Colores actualizados al logo:
- Primary: `#0D2B4F` (navy profundo del fondo del logo)
- Accent: `#3A8FD1` (azul claro del logo)

---

## Modelo de datos (Google Sheets — 3 hojas)

### Hoja `Deudores`
| Columna | Tipo | Notas |
|---|---|---|
| id | string (UUID) | PK, generado por n8n |
| nombre | string | |
| telefono | string | Normalizado a 10 dígitos para dedup |
| fecha_registro | datetime ISO | `$now` al crear |

### Hoja `Prestamos`
| Columna | Tipo | Notas |
|---|---|---|
| id | string (UUID) | PK |
| deudor_id | string | FK a Deudores.id |
| monto_total | number | Capital + intereses juntos |
| fecha_prestamo | date ISO (YYYY-MM-DD) | Fecha en que se entregó el dinero |
| estado | enum | "activo" \| "pagado" |
| fecha_creacion | datetime ISO | `$now` al crear |

### Hoja `Abonos` (solo INSERT, nunca UPDATE/DELETE)
| Columna | Tipo | Notas |
|---|---|---|
| id | string (UUID) | PK |
| prestamo_id | string | FK a Prestamos.id |
| monto | number | |
| fecha | date ISO | Día del abono (editable al registrar) |
| timestamp | datetime ISO | `$now` al registrar (auditoría) |

### Vista derivada (calculada, no almacenada)

`saldo_actual(prestamo_id) = Prestamos.monto_total - SUM(Abonos.monto WHERE prestamo_id = X)`

---

## Estructura del proyecto

```
c:\Cursor\Prestamos\
├── .mcp.json              # Conexión MCP a n8n (existente, pero n8n ya no se usa)
├── CLAUDE.md              # Este archivo
├── web/                   # PWA desplegada en Vercel
│   ├── index.html         # Todo el código (HTML + CSS + Alpine.js inline)
│   ├── manifest.json      # PWA manifest (nombre, theme color, icons)
│   ├── sw.js              # Service worker (network-first, v5)
│   └── icons/
│       └── logo.jpeg      # Logo del cliente (Contabilidad Mobile Solution)
└── .env                   # Credenciales (no commiteado)
```

El código del backend (Apps Script) vive en [script.google.com](https://script.google.com), ligado al Spreadsheet de Google Sheets. No está en el repo.

---

## Backend: Google Apps Script

**URL activa**: `https://script.google.com/macros/s/AKfycbyQLwDJQI5coAzctEZOABzahiVmhWQA1IVJfZnpq8lC5xruI-nxHAUvtuEAc7fUOTRS/exec`

**Spreadsheet ID**: `1GgVrfOJQ4fdMo06tN46twzYQ3Z354VdnsbdiBRRbqJk`

**Importante**: el Apps Script usa `SpreadsheetApp.openById(SHEET_ID)`, NO `getActiveSpreadsheet()` (este último devuelve null en Web App deployments).

### Endpoints

Un solo `/exec` con acciones vía `action=` param:

| Método | action | Descripción | Auth |
|---|---|---|---|
| GET | `login` | Valida user/pass, devuelve token UUID | Ninguna |
| GET | `deudores_activos` | Lista deudores + sus préstamos + abonos | Token |
| POST | `crear_prestamo` | Crea o reutiliza deudor + crea préstamo | Token |
| POST | `registrar_abono` | Inserta abono + marca "pagado" si saldo=0 | Token |

### Auth

Username/password simples (`MobileSolution` / `1234`) definidos como constantes en Apps Script. Al hacer login exitoso, el backend genera un UUID y lo guarda en la hoja `Sessions`. El PWA lo almacena en `localStorage` y lo envía en cada request. **Los tokens no expiran** (por simplicidad — si escala, agregar expiración).

### CORS / POST caveat

Google Apps Script NO responde OPTIONS (preflight). Para evitar preflight:
- GET con query params → simple request, funciona siempre
- POST sin headers custom → fetch default es `text/plain`, simple request, funciona
- **NO** agregar `Content-Type: application/json` en fetch — triggeraría preflight y fallaría con CORS error

### Workflows n8n descontinuados

Existen 4 workflows en n8n etiquetados `[Préstamos]` (Crear préstamo, Registrar abono, Listar activos, Detalle). **Están despublicados y no se usan**. Se conservan como referencia histórica por si se decide volver a n8n en el futuro.

---

## Convenciones del proyecto

| Elemento | Formato | Ejemplo |
|---|---|---|
| Acciones Apps Script | snake_case en param `action` | `crear_prestamo`, `deudores_activos` |
| Variables JS en PWA | camelCase | `montoTotal`, `saldoActual` |
| Nombres de columnas Sheet | snake_case | `monto_total`, `fecha_prestamo` |
| Montos | Siempre number, nunca string con formato | `500000` no `"$500.000"` |
| Fechas | ISO 8601 siempre (YYYY-MM-DD o datetime completo) | `2026-04-18` |

---

## Memoria y referencias

- **Credenciales OAuth, API keys**: están en la memoria auto-cargada del usuario en `C:\Users\usuario\.claude\projects\` (compartida entre proyectos). Revisa MEMORY.md si necesitas credenciales.
- **Skills n8n**: si vas a trabajar con n8n profundamente, los 7 skills (`/n8n-mcp-tools-expert`, `/n8n-workflow-patterns`, etc.) viven en `c:\Cursor\n8n CC\.claude\commands\`. Puedes referenciarlos o copiarlos a este proyecto si hacen falta.

---

## Autonomía

Claude opera con autonomía para:
- Modificar la PWA (index.html, sw.js, manifest.json)
- Modificar el código Apps Script (dándoselo al usuario para que lo pegue en script.google.com — Claude no tiene acceso directo)
- Actualizar configuración en Vercel o DNS vía guía al usuario

**Preguntar solo cuando**:
- Ambigüedad de UX que cambie el diseño de pantalla
- Requiere datos del cliente final
- Decisión con impacto económico (ej. cambiar de hosting pagado)

---

## Estado actual del proyecto

**Fase**: en producción desde 2026-04-19. App entregable al cliente final.

**Lo que existe**:
- PWA en [prestamos.crhist.dev](https://prestamos.crhist.dev) (branded como "Contabilidad Mobile Solution")
- Apps Script Web App activo (URL arriba)
- Google Sheet con 4 hojas: Deudores, Prestamos, Abonos, Sessions
- Backup diario automático configurado como trigger en Apps Script (3am hora Colombia)
- Login con user/pass (`MobileSolution` / `1234`)

**Pendientes (menores, no bloquean producción)**:
- Limpieza periódica de tokens viejos en `Sessions` (crecen sin límite)
- Monitoreo/alertas si el Apps Script cae (actualmente depende del usuario reportar)
- Ver [memory/project_future_features.md](C:\Users\usuario\.claude\projects\c--Cursor-Prestamos\memory\project_future_features.md) para features premium diferidas
