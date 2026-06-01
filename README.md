# 🏷️ StickerVault

A complete inventory management system built for vinyl sticker businesses. Manage stock, orders, production, and barcodes — all in one place.

---

## ✨ Features

- **Dashboard** — Live stats, charts, low-stock alerts, recent activity
- **Inventory** — Products, SKUs, categories, stock history, barcode generation
- **Orders** — Create/manage customer orders, packing lists, status pipeline
- **Production** — Kanban board: Queue → Print → Laminate → Cut → Package → Done
- **Barcodes** — Camera scanner (mobile), CODE-128 + QR code generation, bulk printing
- **Reports** — Analytics charts + CSV/Excel exports
- **Users** — Admin/Staff/Viewer roles, activity logs
- **Dark mode** — Beautiful dark UI, mobile responsive

---

## 🚀 Quick Start (Local)

### 1. Clone and install

```bash
git clone <your-repo>
cd stickervault
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/stickervault"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
```

### 3. Set up the database

```bash
# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo logins:**
- Admin: `admin@stickervault.com` / `admin123`
- Staff: `staff@stickervault.com` / `staff123`

---

## ☁️ Deploy to Render

### Option A — One-click with render.yaml

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repository — Render reads `render.yaml` automatically
4. Set these environment variables in Render dashboard:
   - `NEXTAUTH_URL` → `https://your-app.onrender.com`
   - `NEXTAUTH_SECRET` → run `openssl rand -base64 32` locally
5. Deploy!

### Option B — Manual setup

**Database:**
1. Render Dashboard → New → PostgreSQL
2. Name: `stickervault-db`, Region: Frankfurt (or nearest)
3. Copy the **Internal Database URL**

**Web Service:**
1. Render Dashboard → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Node version:** 20+
4. Environment Variables:
   ```
   DATABASE_URL=<internal db url from above>
   NEXTAUTH_URL=https://your-app.onrender.com
   NEXTAUTH_SECRET=<random 32+ char string>
   NODE_ENV=production
   ```

### After first deploy — run migrations and seed

In Render → your web service → Shell:
```bash
npm run db:migrate
npm run db:seed
```

---

## 📁 Project Structure

```
stickervault/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data seeder
├── src/
│   ├── app/
│   │   ├── (app)/         # Authenticated app pages
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── production/
│   │   │   ├── barcodes/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   └── settings/
│   │   ├── api/           # API routes
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── production/
│   │   │   ├── inventory/
│   │   │   ├── barcodes/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   ├── categories/
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── login/
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/        # Sidebar, MobileNav
│   │   ├── inventory/     # AddProductModal, StockAdjustModal
│   │   ├── orders/        # CreateOrderModal, PackingListModal
│   │   ├── production/    # CreateJobModal
│   │   └── barcodes/      # BarcodeDisplay
│   └── lib/
│       ├── prisma.ts      # Prisma client singleton
│       ├── auth.ts        # NextAuth config
│       ├── utils.ts       # Helpers & formatters
│       ├── barcode.ts     # Server-side barcode generation
│       └── stock.ts       # Stock movement helpers
├── render.yaml            # Render deployment config
└── .env.example
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (JWT) |
| Styling | Tailwind CSS (dark mode) |
| Charts | Recharts |
| Barcodes | JsBarcode + qrcode |
| Exports | ExcelJS + CSV |
| State | TanStack Query + Zustand |
| Deployment | Render.com |

---

## 📱 Mobile Features

- Fully responsive layout with bottom navigation bar
- Camera barcode scanner using Web BarcodeDetector API (Chrome/Android)
- Touch-friendly modals (slide up from bottom)
- Mobile-optimised tables with collapsible columns

---

## 🏷️ Barcode System

Every product gets:
- **CODE-128 barcode** — Scannable by any standard barcode scanner
- **QR code** — Contains the barcode value, scannable by phone cameras
- **Full label** — Name + SKU + price + barcode + QR in one printable image

Scan with:
- Physical USB/Bluetooth barcode scanners (plug-and-play with manual entry field)
- Phone camera via the Barcodes page (uses BarcodeDetector API)

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_URL` | ✅ | Full URL of your app |
| `NEXTAUTH_SECRET` | ✅ | Random secret (min 32 chars) |
| `NODE_ENV` | ✅ | `production` on Render |

---

## 📄 License

MIT — use freely for your business.
