# Prestamos — App de Gestión de Préstamos

PWA para que un prestamista colombiano registre y gestione préstamos diarios.

## Stack

- **Frontend:** HTML + Tailwind CSS + Alpine.js (PWA)
- **Backend:** n8n webhooks + Google Sheets
- **Hosting:** Vercel
- **Dominio:** prestamos.crhist.dev (subdominio de crhist.dev)

## Estructura

```
web/
├── index.html       # PWA completa (2 pantallas)
├── manifest.json    # Instalación como app
├── sw.js            # Service worker (offline)
```

## Deploy a Vercel

1. **Sube el código a GitHub:**
   ```bash
   cd c:\Cursor\Prestamos
   git init
   git add web/
   git commit -m "Initial PWA"
   git remote add origin https://github.com/tu-usuario/prestamos
   git push -u origin main
   ```

2. **En Vercel (vercel.com):**
   - Conecta el repo de GitHub
   - Root Directory: `web`
   - Deploy

3. **DNS en crhist.dev:**
   - Apunta `prestamos.crhist.dev` a Vercel (CNAME)
   - O usa el subdominio que Vercel te asigne

## Workflows n8n Activos

- `POST /prestamos/abono` — Registra abono
- `GET /prestamos/activos` — Lista préstamos activos
- `GET /prestamos/:id` — Detalle de préstamo + abonos

*El webhook POST /prestamos/nuevo está duplicado — limpiar en n8n UI.*

## Datos en Google Sheets

Sheet: `Prestamos_DB`
- **Deudores:** id, nombre, telefono, fecha_registro
- **Prestamos:** id, deudor_id, monto_total, fecha_prestamo, estado, fecha_creacion
- **Abonos:** id, prestamo_id, monto, fecha, timestamp

## Notas

- Abonos son inmutables (write-only)
- Saldo calculado = monto_total - SUM(abonos)
- Cuando saldo = 0 → préstamo pasa a estado "pagado" (automático en workflow)
- App funciona offline (service worker)
- Instalable en home screen
