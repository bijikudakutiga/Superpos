# Ruang Kontrol Produksi — MVP POS + Produksi

Aplikasi ini dibangun dengan React + Vite. Saat ini penyimpanan data memakai
**localStorage browser** — jadi begitu di-deploy, aplikasi langsung bisa
dipakai tanpa setup database. Folder `supabase/schema.sql` sudah disiapkan
untuk tahap berikutnya ketika kamu siap pindah ke database sungguhan (lihat
bagian "Menghubungkan Supabase" di bawah).

## Menjalankan di komputer sendiri (opsional, untuk coba-coba dulu)

```bash
npm install
npm run dev
```

Buka alamat yang muncul di terminal (biasanya `http://localhost:5173`).

## Deploy ke Netlify

**Cara paling gampang (drag & drop, tanpa command line):**

1. Buka [app.netlify.com](https://app.netlify.com) → daftar/login (bisa pakai akun Google/GitHub).
2. Di komputer, extract file zip project ini, lalu jalankan:
   ```bash
   npm install
   npm run build
   ```
   Ini akan menghasilkan folder `dist/`.
3. Di dashboard Netlify, pilih **"Add new site" → "Deploy manually"**, lalu drag & drop folder `dist/` tadi ke sana.
4. Selesai — Netlify akan kasih kamu URL seperti `nama-acak.netlify.app`. Bisa diganti nama di Site settings > Domain management.

**Cara yang lebih enak untuk update berkala (lewat GitHub):**

1. Upload project ini ke repository GitHub.
2. Di Netlify: **"Add new site" → "Import an existing project"** → hubungkan ke repo GitHub kamu.
3. Netlify otomatis mendeteksi `netlify.toml` (build command `npm run build`, folder output `dist`).
4. Setiap kamu push perubahan ke GitHub, Netlify otomatis build & deploy ulang.

## Menghubungkan Supabase + Login Sungguhan (SUDAH AKTIF di kode ini)

App.jsx sekarang **otomatis mencoba konek ke Supabase**, dan mewajibkan login
kalau env var-nya terisi. Kalau belum diisi, aplikasi tetap jalan normal pakai
localStorage + dropdown role demo (fallback otomatis, tidak error) — cocok
untuk uji coba tanpa setup apapun.

**Langkah bikin project Supabase:**

1. Daftar di [supabase.com](https://supabase.com), buat project baru (pilih region terdekat, misalnya Singapore).
2. Buka menu **SQL Editor**, jalankan berurutan:
   - `supabase/schema_app_state.sql` (tabel penyimpanan data aplikasi)
   - `supabase/schema_auth.sql` (tabel profil pengguna + aturan keamanan/RLS)
3. Buka menu **Project Settings > API**, catat dua nilai:
   - **Project URL** → untuk `VITE_SUPABASE_URL`
   - **anon public key** → untuk `VITE_SUPABASE_ANON_KEY`

**Bikin akun login (tidak ada form daftar sendiri, sengaja dibuat begini demi keamanan):**

1. Di dashboard Supabase: **Authentication → Users → Add user**. Isi email + password, centang **"Auto Confirm User"**.
2. Buka aplikasi (setelah env var terpasang), login pakai email+password tadi.
3. Setelah login pertama kali, kamu akan lihat layar **"Menunggu Penugasan Role"** — itu normal, karena belum ada Super Admin yang menugaskan role.
4. Untuk user PERTAMA (Super Admin awal), jadikan super_admin lewat SQL Editor:
   ```sql
   update profiles set role = 'super_admin' where email = 'email-kamu@perusahaan.com';
   ```
5. Refresh halaman — sekarang kamu masuk sebagai Super Admin, dan bisa bikin/tugaskan role untuk user lain lewat menu **"Kelola Pengguna"** di aplikasi (tanpa perlu SQL lagi).

**Menghubungkan ke aplikasi:**

- Coba di komputer sendiri: copy `.env.example` jadi `.env`, isi dua nilai di atas, lalu `npm run dev`.
- Di Netlify: **Site settings > Environment variables** → tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` → klik **"Trigger deploy"**.
- Kalau berhasil, badge di pojok kanan atas berubah jadi **"● Supabase Tersambung"**, dan kamu akan diminta login (bukan dropdown demo lagi).

**Catatan keamanan:** sekarang tabel `app_state` hanya bisa diakses user yang
sudah login (bukan siapa saja seperti sebelumnya). Tapi karena semua data
masih 1 baris JSON bersama, semua role yang login tetap berbagi baris data
yang sama — pembatasan "siapa boleh lihat/ubah apa" tetap dikerjakan di sisi
tampilan (menu yang muncul sesuai role), bukan di level baris database. Kalau
2 orang menyimpan perubahan persis bersamaan, yang terakhir menang
(last-write-wins) — untuk tim kecil ini masih aman. `supabase/schema.sql`
(ternormalisasi per tabel) tetap disimpan sebagai referensi migrasi lanjutan.


## Struktur folder

```
├── src/
│   ├── App.jsx           # seluruh UI & logic aplikasi
│   ├── main.jsx          # entry point React
│   └── supabaseClient.js # scaffold koneksi Supabase (belum dipakai App.jsx)
├── supabase/
│   ├── schema_app_state.sql # skema AKTIF dipakai App.jsx — jalankan ini di SQL Editor
│   ├── schema_auth.sql       # tabel profil pengguna + aturan keamanan login (jalankan setelah schema_app_state.sql)
│   └── schema.sql           # skema ternormalisasi lengkap, referensi migrasi tahap lanjutan
├── netlify.toml           # konfigurasi build Netlify
└── .env.example           # contoh environment variable Supabase
```
