// Scaffold koneksi Supabase.
// Saat ini App.jsx masih memakai localStorage browser sebagai penyimpanan (langsung
// jalan tanpa setup apapun). File ini disiapkan untuk migrasi ke Supabase nanti,
// begitu kamu sudah punya project Supabase (lihat README.md bagian "Menghubungkan Supabase").

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// supabase akan bernilai null jika env var belum diisi, supaya app tetap jalan
// dengan localStorage sampai kamu siap pindah ke database sungguhan.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
