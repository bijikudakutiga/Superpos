-- =====================================================================
-- SKEMA CEPAT UNTUK KONEKSI APP.JSX SAAT INI
-- Jalankan ini di Supabase SQL Editor (menu "SQL Editor" > "New query")
-- =====================================================================
--
-- CATATAN PENTING:
-- App.jsx saat ini menyimpan SEMUA data (bahan baku, resep, batch, opname,
-- POS, permission) sebagai SATU baris JSON di tabel ini. Ini bukan desain
-- final yang ideal (idealnya per-modul punya tabel sendiri seperti di
-- schema.sql), tapi ini cara TERCEPAT untuk membuat data benar-benar
-- tersimpan di server & bisa diakses banyak device — tanpa perlu menulis
-- ulang seluruh logic aplikasi dari nol.
--
-- Konsekuensinya: kalau 2 orang menyimpan perubahan di waktu yang RIS
-- persis bersamaan, yang terakhir menyimpan akan menimpa punya yang lain
-- (last-write-wins). Untuk tim kecil dengan pemakaian bergantian, ini
-- masih aman. Migrasi ke tabel per-modul (schema.sql) bisa dikerjakan
-- belakangan kalau sudah butuh laporan/query yang lebih rumit atau
-- proteksi akses per baris data.

create table if not exists app_state (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into app_state (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- Row Level Security: untuk sekarang dibuka lebar (siapa saja yang punya
-- anon key bisa baca & tulis). Ini SEMENTARA sampai fitur login sungguhan
-- dikerjakan (tahap berikutnya). Jangan bagikan project URL + anon key ke
-- luar tim untuk saat ini.
alter table app_state enable row level security;

create policy "allow read for now"
  on app_state for select
  using (true);

create policy "allow write for now"
  on app_state for update
  using (true)
  with check (true);
