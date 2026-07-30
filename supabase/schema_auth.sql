-- =====================================================================
-- SKEMA AUTENTIKASI & ROLE PENGGUNA
-- Jalankan ini di Supabase SQL Editor SETELAH menjalankan schema_app_state.sql
-- =====================================================================

-- Tabel profil: 1 baris per akun login, menyimpan role yang ditugaskan
-- Super Admin. Baris ini dibuat OTOMATIS oleh aplikasi saat user login
-- pertama kali (role masih kosong sampai Super Admin menugaskan lewat
-- menu "Kelola Pengguna").
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text, -- 'super_admin' | 'manager' | 'warehouse' | 'produksi' | 'sales' | null (belum ditugaskan)
  created_at timestamptz default now()
);

-- Fungsi bantu: cek apakah user yang sedang login adalah super_admin.
-- security definer supaya bisa baca tabel profiles walau RLS aktif.
create or replace function is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'super_admin', false);
$$;

alter table profiles enable row level security;

drop policy if exists "read own or super admin reads all" on profiles;
create policy "read own or super admin reads all"
  on profiles for select
  using (id = auth.uid() or is_super_admin());

drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
  on profiles for insert
  with check (id = auth.uid());

drop policy if exists "super admin updates any, user cannot self-promote" on profiles;
create policy "super admin updates any, user cannot self-promote"
  on profiles for update
  using (is_super_admin())
  with check (is_super_admin());

-- =====================================================================
-- PERKETAT AKSES app_state: sebelumnya dibuka untuk siapa saja (anon key).
-- Sekarang hanya user yang SUDAH LOGIN (authenticated) yang boleh akses.
-- =====================================================================
drop policy if exists "allow read for now" on app_state;
drop policy if exists "allow write for now" on app_state;

create policy "authenticated users can read app_state"
  on app_state for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can update app_state"
  on app_state for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =====================================================================
-- CATATAN PENTING
-- =====================================================================
-- 1. Akun login TIDAK dibuat lewat form signup di aplikasi (sengaja).
--    Super Admin membuat akun lewat: Supabase Dashboard → Authentication
--    → Users → "Add user" (isi email + password manual, atau centang
--    "Auto Confirm User" supaya tidak perlu verifikasi email).
-- 2. Setelah user itu login pertama kali di aplikasi, baris profil akan
--    otomatis muncul di menu "Kelola Pengguna" (role masih kosong).
--    Super Admin tinggal pilih role-nya di situ.
-- 3. Baris pertama yang perlu dijadikan 'super_admin' harus di-set MANUAL
--    lewat SQL Editor (karena belum ada Super Admin lain yang bisa
--    menugaskan lewat UI). Setelah user pertama login, jalankan:
--    update profiles set role = 'super_admin' where email = 'email-kamu@perusahaan.com';
-- =====================================================================
