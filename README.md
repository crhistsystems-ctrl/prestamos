# Prestamos — App de Gestión de Préstamos

PWA para que un prestamista colombiano registre y gestione préstamos diarios.

## Stack

- **Frontend:** HTML + Tailwind CSS + Alpine.js (PWA)
- **Backend:** Google Apps Script (Web App) + Google Sheets
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

## Endpoints (Google Apps Script)

Un solo `/exec` con acciones vía `action=` param (ver CLAUDE.md para detalle completo):

- `GET  action=login` — Login, devuelve token
- `GET  action=deudores_activos` — Lista deudores + préstamos + abonos
- `POST action=crear_prestamo` — Crea/reutiliza deudor + crea préstamo
- `POST action=registrar_abono` — Inserta abono, marca "pagado" si saldo=0

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
