# 🚀 Deployment Guide — Atrioom SaaS

Panduan lengkap deploy Atrioom ke **Vercel** (web) + **Render** (API) + **Supabase** (database).
Target: **20-30 menit** dari nol sampai URL production bisa dibuka.

> **TL;DR:** Setup Supabase → Deploy API ke Render → Deploy Web ke Vercel → Set CORS → Smoke test.

---

## 📋 Prerequisites

Pastikan sudah punya:
- [ ] Akun GitHub (yang punya repo `rafaelsitorus/Atrioom`)
- [ ] Akses ke Supabase project yang sudah dibuat (lihat Step 1)
- [ ] Browser modern (Chrome/Firefox/Safari)

Anda **tidak perlu** install apa-apa di komputer lokal — semua dilakukan via web UI.

---

## Step 1 — Setup Supabase (5-10 menit)

### 1.1 Buat Project (jika belum)
- Buka https://supabase.com/dashboard
- **New Project** → region **Singapore** → set password DB → **Create**

### 1.2 Catat 3 Kredensial
Setelah project ready, pergi ke **Settings → API**:

| Key | Lokasi | Dimulai dengan |
|---|---|---|
| `SUPABASE_URL` | Project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Project API keys → anon | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → service_role | `eyJ...` (JANGAN expose ke FE!) |

### 1.3 Jalankan Migration SQL
Pergi ke **SQL Editor**, jalankan **berurutan** (Run satu-satu, tunggu sukses):

1. Copy-paste isi `apps/api/src/db/migrations/0001_init.sql` → Run
2. Copy-paste isi `apps/api/src/db/migrations/0002_seating.sql` → Run
3. Copy-paste isi `apps/api/src/db/migrations/0003_checkin.sql` → Run

Verifikasi: **Table Editor** harus punya tabel:
`events`, `event_members`, `guests`, `tables`, `seats`,
`seat_assignments`, `seating_audit`, `check_ins`, `check_in_audit`.

### 1.4 Buat User Pertama
**Authentication → Users → Add user → Create new user**
- Email: `<email-anda>`
- Password: `<password-anda>` (simpan di password manager)
- Centang **Auto Confirm User**

---

## Step 2 — Deploy API ke Render (5-10 menit)

### 2.1 Login
- Buka https://render.com → **Get Started for Free** → sign up via GitHub

### 2.2 Buat Blueprint Service
- Klik **New +** → **Blueprint**
- Pilih repo `rafaelsitorus/Atrioom` → klik **Connect**
- Render akan mendeteksi `apps/api/render.yaml` dan menampilkan preview
- Klik **Apply** → tunggu sekitar 2-3 menit

### 2.3 Set Environment Variables
Pergi ke **Dashboard → atrioom-api → Environment**:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `<dari Step 1.2>` |
| `SUPABASE_ANON_KEY` | `<dari Step 1.2>` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<dari Step 1.2>` |
| `ALLOWED_ORIGINS` | `<akan diisi di Step 4>` (kosong dulu OK) |

Klik **Save Changes** → Render otomatis re-deploy.

### 2.4 Verifikasi
Buka URL Render: `https://atrioom-api.onrender.com/health`
Expected output: `{"status":"ok","ts":"..."}`

> **Catatan Free tier:** Render free akan sleep setelah 15 menit idle → request pertama ~30-50s. Untuk production event, upgrade ke Starter ($7/bulan).

### 2.5 Ambil Deploy Hook URL (opsional, untuk GitHub Actions)
**Settings → Deploy Hook** → beri nama `github-staging` → **Add**
Salin URL yang muncul → paste ke GitHub Secrets sebagai `RENDER_DEPLOY_HOOK_URL` (lihat Step 5).

---

## Step 3 — Deploy Web ke Vercel (3-5 menit)

### 3.1 Login
- Buka https://vercel.com → **Sign Up** → sign up via GitHub

### 3.2 Import Project
- **Add New → Project** → pilih `rafaelsitorus/Atrioom` → **Import**

### 3.3 Konfigurasi
Di halaman setup:

| Field | Value |
|---|---|
| Project Name | `atrioom-web` |
| Framework Preset | Next.js (auto-detect) |
| Root Directory | `apps/web` |
| Build Command | (auto, atau `pnpm build`) |
| Output Directory | `.next` (auto) |

### 3.4 Environment Variables
Expand **Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `<dari Step 1.2>` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<dari Step 1.2>` |
| `INTERNAL_API_BASE_URL` | `https://atrioom-api.onrender.com` |

### 3.5 Deploy
Klik **Deploy** → tunggu build selesai (~2-3 menit).
Setelah selesai, Vercel beri URL: `https://atrioom-web.vercel.app`

---

## Step 4 — Set CORS di Render (1 menit)

Sekarang web sudah punya URL. Set `ALLOWED_ORIGINS` di Render:

- Pergi ke **Render Dashboard → atrioom-api → Environment**
- Edit `ALLOWED_ORIGINS` → value: `https://atrioom-web.vercel.app`
- Save → Render otomatis re-deploy (~1-2 menit)

---

## Step 5 — Setup GitHub Actions untuk Auto-Deploy (Opsional, 5 menit)

Supaya setiap push ke `staging` otomatis deploy.

### 5.1 Vercel Token
- Buka https://vercel.com/account/tokens → **Create Token** → beri nama `atrioom-deploy`
- Copy token → simpan

### 5.2 Vercel Project ID
- Vercel Dashboard → Project Settings → **General** → catat **Project ID**

### 5.3 Vercel Org ID
- Vercel Dashboard → Team Settings → **General** → catat **Team ID** (= Org ID)

### 5.4 GitHub Secrets
- Pergi ke repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**
- Tambahkan secrets ini satu-satu:

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | `<dari 5.1>` |
| `VERCEL_ORG_ID` | `<dari 5.3>` |
| `VERCEL_PROJECT_ID` | `<dari 5.2>` |
| `NEXT_PUBLIC_SUPABASE_URL` | `<dari Step 1.2>` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<dari Step 1.2>` |
| `INTERNAL_API_BASE_URL` | `https://atrioom-api.onrender.com` |
| `RENDER_DEPLOY_HOOK_URL` | `<dari Step 2.5>` (kosongkan jika tidak pakai) |

### 5.5 Trigger Pertama
- Push branch staging ke GitHub: `git push origin staging`
- Tab **Actions** → lihat workflow jalan

---

## Step 6 — Smoke Test (5 menit)

Buka **https://atrioom-web.vercel.app** di browser:

### 6.1 Login
- Halaman `/login` muncul? ✅
- Login dengan user Step 1.4 → redirect ke `/dashboard`? ✅

### 6.2 Buat Event
- Sidebar → **Events** (atau `/events`)
- **+ Event Baru** → isi nama, tanggal → **Buat Event**
- Redirect ke halaman guests? ✅

### 6.3 Tambah Tamu
- **Import Excel** → upload template → atau **+ Walk-In**
- Tamu muncul di tabel? ✅

### 6.4 Test Scanner (opsional)
- Buka `/events/[id]/scanner` di **2 device berbeda**:
  - Device A: laptop untuk scan
  - Device B: HP untuk buka `/ticket/[qr_token]` dan tampilkan QR
- Di Device A, scan QR dari Device B → muncul konfirmasi ✅

### 6.5 Test Real-time
- Buka `/events/[id]/live` di laptop
- Scan QR di HP → muncul entry baru real-time ✅

### 6.6 Test Offline (opsional)
- Di device scanner, **matikan WiFi** → scan QR → muncul "Offline"
- **Nyalakan WiFi** → tunggu beberapa detik → entry terkirim otomatis ✅

### 6.7 Test Reports
- `/events/[id]/reports` → KPI muncul? ✅
- Klik **Export Excel** → file `.xlsx` download? ✅

---

## 🎉 Selesai!

Aplikasi Atrioom sekarang live. URL yang bisa dibuka:

| Service | URL |
|---|---|
| Web (Operator) | `https://atrioom-web.vercel.app` |
| API (Backend) | `https://atrioom-api.onrender.com/health` |
| Database | Supabase Dashboard |

---

## 🔧 Custom Domain (Opsional)

Kalau Anda punya domain sendiri (mis. `atrioom.id`):

### Vercel
- Project Settings → **Domains** → add `app.atrioom.id`
- Setup DNS: CNAME `app` → `cname.vercel-dns.com`

### Render
- Service Settings → **Custom Domains** → add `api.atrioom.id`
- Setup DNS: CNAME `api` → `<render-provided>.onrender.com`

Update `ALLOWED_ORIGINS` di Render ke `https://app.atrioom.id` dan `INTERNAL_API_BASE_URL` di Vercel ke `https://api.atrioom.id`.

---

## 📞 Troubleshooting

### ❌ "Failed to fetch" di web
**Cause:** `INTERNAL_API_BASE_URL` salah atau API down.
**Fix:**
1. Buka `https://atrioom-api.onrender.com/health` di browser — kalau down, cek Render Dashboard logs.
2. Cek env var `INTERNAL_API_BASE_URL` di Vercel — harus `https://atrioom-api.onrender.com` (tanpa trailing slash).

### ❌ "Invalid API key" atau auth error
**Cause:** Supabase credentials tidak match.
**Fix:** Cross-check 3 env vars di Vercel & Render dengan Supabase Dashboard.

### ❌ CORS error di console
**Cause:** `ALLOWED_ORIGINS` di Render tidak berisi URL Vercel.
**Fix:** Set ke `https://atrioom-web.vercel.app` (atau custom domain).

### ❌ Login berhasil tapi dashboard kosong
**Cause:** User belum jadi event member.
**Fix:** Untuk sekarang, `org_id` di-event = `user.id` (single-tenant mode). User otomatis jadi OWNER event yang dia buat. Coba **Create Event** baru dari dashboard.

### ❌ "relation does not exist" saat pakai app
**Cause:** Migration SQL belum dijalankan.
**Fix:** Ulangi Step 1.3 (jalankan 3 migration files berurutan).

### ❌ Build fail di Vercel: "Cannot find module"
**Cause:** Deps tidak terinstall.
**Fix:** Cek `package.json` punya semua deps. Coba **Redeploy** dari Vercel dashboard.

### ❌ Build fail di Render: "tsc: not found"
**Cause:** Root project tidak punya pnpm di PATH.
**Fix:** Pastikan `package.json` ada di root + `pnpm-workspace.yaml` benar. Render otomatis detect Node.

---

## 📊 Biaya Berjalan

| Service | Tier | Biaya |
|---|---|---|
| Vercel | Hobby (Free) → Pro $20/bln | $0 untuk development |
| Render | Free → Starter $7/bln | $0 untuk dev, $7/bln untuk production |
| Supabase | Free (500MB DB) → Pro $25/bln | $0 untuk MVP |
| **Total** | | **$0/bln** (MVP), **~$12-50/bln** (production) |

---

## 🔐 Catatan Keamanan Production

Sebelum pakai untuk event komersial:

- [ ] Set strong password untuk user Supabase pertama
- [ ] Enable **Email Confirm** di Supabase Auth settings (jika pakai sign-up)
- [ ] Set **RLS** sudah aktif (sudah, by design)
- [ ] Custom domain dengan HTTPS (otomatis di Vercel/Render)
- [ ] Backup DB: enable **Point-in-Time Recovery** di Supabase Pro
- [ ] Monitor: tambah Sentry (opsional)

---

## 🎯 Next Steps Setelah Live

1. **Custom logo di QR** — embed logo Atrioom di tengah QR di `/ticket/[id]` (saat ini plain).
2. **Multi-tenant** — saat Anda punya >1 klien, tambahkan tabel `organizations` & migrasi `org_id` jadi foreign key.
3. **Email notifikasi** — kirim email ke admin saat ada check-in VIP (Supabase SMTP + trigger).
4. **Sentry monitoring** — tambah `@sentry/nextjs` + `@sentry/node`.
5. **Mobile-native wrapper** — wrap PWA ke APK via Capacitor untuk distribusi ke device scanner tanpa install manual.

---

Butuh bantuan? Tanyakan ke saya atau cek log di:
- Vercel: https://vercel.com/dashboard → klik project → tab **Logs**
- Render: https://dashboard.render.com → klik service → tab **Logs**
- Supabase: https://supabase.com/dashboard → **Logs** di sidebar