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
PWA custom (HTML + Tailwind + Alpine.js)
Hospedada en Vercel bajo subdominio prestamos.crhist.dev
         │
         ▼  (fetch JSON via webhooks)
n8n backend (instancia en 146.190.39.178:5678)
         │
         ▼
Google Sheets (en cuenta del desarrollador, NO del cliente)
```

### Decisiones de stack

| Componente | Elección | Razón |
|---|---|---|
| Frontend | PWA con HTML + Tailwind + Alpine.js | Ligero, sin build step, se ve pulido, funciona offline, instalable al home screen |
| Hosting frontend | Vercel free tier | Gratis para 1 usuario, deploy automático desde Git |
| Backend | n8n (ya existente) | Reusa infra actual, webhooks rápidos de montar |
| Base de datos | Google Sheets | Simple para 15-50 deudores; fácil de respaldar; si escala, se migra a Supabase |
| Dominio | `prestamos.crhist.dev` (subdominio del desarrollador) | Control total, sin pagos adicionales |

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

**Pendiente** — el cliente lo decidirá después. Por ahora usar placeholder "Préstamos" o el nombre del cliente si se conoce.

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
├── .mcp.json              # Conexión MCP a n8n (ya creada)
├── CLAUDE.md              # Este archivo
├── web/                   # PWA (por construir)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── manifest.json
│   ├── sw.js              # Service worker
│   └── icons/
├── n8n/                   # Definiciones de workflows (por construir)
│   └── (workflows exportados como JSON para versionar)
└── docs/                  # Notas del proyecto si hacen falta
```

---

## Workflows n8n a construir

Tag recomendado: `prestamos`. Naming: `[Préstamos] <descripción>`.

1. **[Préstamos] API — Crear préstamo**
   - Webhook POST `/prestamos/nuevo`
   - Input: `{ nombre, telefono, monto_total, fecha_prestamo }`
   - Lógica: busca deudor por teléfono normalizado → si existe usa su id, si no lo crea → crea préstamo con estado "activo"
   - Output: `{ deudor_id, prestamo_id, saldo_actual }`

2. **[Préstamos] API — Registrar abono**
   - Webhook POST `/prestamos/abono`
   - Input: `{ prestamo_id, monto, fecha }`
   - Lógica: inserta abono → calcula nuevo saldo → si saldo = 0, marca préstamo como "pagado"
   - Output: `{ saldo_actual, estado }`

3. **[Préstamos] API — Listar préstamos activos**
   - Webhook GET `/prestamos/activos`
   - Output: array de `{ prestamo_id, deudor_nombre, deudor_telefono, monto_total, saldo_actual, dias_transcurridos, fecha_prestamo }`

4. **[Préstamos] API — Detalle de préstamo**
   - Webhook GET `/prestamos/:id`
   - Output: `{ prestamo, deudor, abonos[], saldo_actual }`

**Auth**: header con API key (hardcodeado en la PWA — no es crítico porque el dominio es controlado). Para producción se puede endurecer después.

---

## Convenciones del proyecto

| Elemento | Formato | Ejemplo |
|---|---|---|
| Workflow n8n | `[Préstamos] <descripción>` | `[Préstamos] API — Registrar abono` |
| Webhook path | `/prestamos/<accion>` en kebab-case | `/prestamos/nuevo` |
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
- Diseñar la estructura del código de la PWA
- Crear workflows en n8n via MCP
- Configurar hojas de Google Sheets (estructura y fórmulas)
- Desplegar a Vercel

**Preguntar solo cuando**:
- Ambigüedad de UX que cambie el diseño de pantalla
- Requiere datos del cliente final (nombre de app, logo)
- Decisión con impacto económico (ej. cambiar de hosting pagado)

---

## Estado actual del proyecto

**Fase**: diseño cerrado, listo para construir.

**Próximos pasos**:
1. Crear Google Sheet con las 3 hojas (Deudores, Prestamos, Abonos) en la cuenta Google del desarrollador
2. Construir los 4 workflows n8n (crear préstamo, registrar abono, listar activos, detalle)
3. Construir la PWA con las 2 pantallas
4. Desplegar a Vercel bajo `prestamos.crhist.dev`
5. Probar end-to-end con datos de prueba
6. Entregar al cliente para validación
