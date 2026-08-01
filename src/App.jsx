import React, { useState, useEffect, useRef } from "react";
import { Package, Beaker, Truck, ChefHat, Gauge, Plus, Trash2, X, Save, AlertTriangle, CheckCircle2, RotateCcw, Factory, ClipboardList, ShieldCheck, Check, XCircle, ShoppingCart, Settings, Minus, Wallet, Download, Calculator, CalendarDays, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function exportExcel(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename + ".xlsx");
}

function exportPDF(filename, title, rows) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  const columns = rows.length ? Object.keys(rows[0]) : [];
  autoTable(doc, {
    startY: 22,
    head: [columns],
    body: rows.map((r) => columns.map((c) => r[c])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [208, 24, 41] },
  });
  doc.save(filename + ".pdf");
}

function inDateRange(isoDate, fromDate, toDate) {
  if (!isoDate) return false;
  const d = isoDate.slice(0, 10);
  if (fromDate && d < fromDate) return false;
  if (toDate && d > toDate) return false;
  return true;
}

function DateFilterExport({ fromDate, toDate, setFromDate, setToDate, onExportExcel, onExportPDF }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
      <Field label="Dari tanggal">
        <input type="date" style={inputStyle} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      </Field>
      <Field label="Sampai tanggal">
        <input type="date" style={inputStyle} value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </Field>
      {(fromDate || toDate) && (
        <button style={btnGhost} onClick={() => { setFromDate(""); setToDate(""); }}><X size={14} />Reset</button>
      )}
      <div style={{ flex: 1 }} />
      <button style={btnGhost} onClick={onExportExcel}><Download size={14} />Excel</button>
      <button style={btnGhost} onClick={onExportPDF}><Download size={14} />PDF</button>
    </div>
  );
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');`;

const COLORS = {
  bg: "#FFF8F3",
  panel: "#FFFFFF",
  panelLight: "#FFF3EC",
  crimson: "#E31E24",
  crimsonDim: "#8C0F1C",
  orange: "#F7941D",
  orangeDim: "#C9720E",
  ink: "#221512",
  muted: "#8A7B70",
  alert: "#D6401F",
  success: "#1F8A4C",
  border: "#F5DFCB",
};

const SEED_UNITS = [
  { id: "gram", name: "Gram", symbol: "gr", type: "berat", toBase: 1 },
  { id: "kg", name: "Kilogram", symbol: "kg", type: "berat", toBase: 1000 },
  { id: "ml", name: "Mililiter", symbol: "ml", type: "volume", toBase: 1 },
  { id: "liter", name: "Liter", symbol: "l", type: "volume", toBase: 1000 },
  { id: "pcs", name: "Pcs", symbol: "pcs", type: "satuan", toBase: 1 },
];

const TYPE_LABEL = { berat: "Berat", volume: "Volume", satuan: "Satuan" };

const ROLES = [
  { id: "super_admin", label: "Super Admin" },
  { id: "manager", label: "Manager" },
  { id: "warehouse", label: "Warehouse" },
  { id: "produksi", label: "Produksi" },
  { id: "finance", label: "Finance" },
  { id: "sales", label: "Sales" },
];
function canApprove(role) { return role === "manager" || role === "super_admin"; }
function canInputOpname(role) { return role === "warehouse" || role === "produksi" || role === "super_admin"; }
function canManageBatch(role) { return role === "produksi" || role === "super_admin"; }

const MODULES = [
  { id: "dashboard", label: "Dasbor" },
  { id: "pos", label: "Input Order" },
  { id: "orderlist", label: "List Order" },
  { id: "materials", label: "Bahan Baku" },
  { id: "finishedgoods", label: "Barang Jadi" },
  { id: "opname", label: "Stock Opname" },
  { id: "recipes", label: "Resep" },
  { id: "batchcreate", label: "Buat Jadwal Produksi" },
  { id: "batchlist", label: "List Antrean Produksi" },
  { id: "suppliers", label: "List Supplier" },
  { id: "purchases", label: "Buat PO" },
  { id: "pettycash", label: "Kas" },
  { id: "units", label: "Satuan" },
  { id: "audit", label: "Log Aktivitas" },
];

const DEFAULT_PERMISSIONS = {
  manager: ["dashboard", "pos", "orderlist", "materials", "finishedgoods", "opname", "recipes", "batchcreate", "batchlist", "suppliers", "purchases", "pettycash", "units", "audit"],
  warehouse: ["dashboard", "materials", "finishedgoods", "opname", "suppliers", "purchases"],
  produksi: ["dashboard", "materials", "finishedgoods", "recipes", "batchcreate", "batchlist", "opname"],
  finance: ["dashboard", "purchases", "suppliers", "pettycash", "audit"],
  sales: ["dashboard", "pos", "orderlist"],
};

const ORDER_STATUSES = [
  { id: "masuk", label: "Order Masuk" },
  { id: "diproses", label: "Diproses" },
  { id: "siap_kirim", label: "Siap Kirim" },
  { id: "terkirim", label: "Terkirim" },
];
function nextOrderStatus(current) {
  const idx = ORDER_STATUSES.findIndex((s) => s.id === current);
  return idx >= 0 && idx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[idx + 1].id : null;
}

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

function seedData() {
  const suppliers = [{ id: uid("sup"), name: "CV Sumber Pangan", phone: "0812-xxxx-xxxx" }];
  const rawMaterials = [
    { id: uid("rm"), code: "RM-001", name: "Tepung Terigu", baseUnitId: "gram", purchaseUnitId: "kg", stock: 8000, minAlert: 2000, supplierId: suppliers[0].id, lastPrice: 12000, priceHistory: [{ price: 12000, date: new Date().toISOString() }] },
    { id: uid("rm"), code: "RM-002", name: "Gula Pasir", baseUnitId: "gram", purchaseUnitId: "kg", stock: 3200, minAlert: 1000, supplierId: suppliers[0].id, lastPrice: 15000, priceHistory: [{ price: 15000, date: new Date().toISOString() }] },
    { id: uid("rm"), code: "RM-003", name: "Susu Cair", baseUnitId: "ml", purchaseUnitId: "liter", stock: 4000, minAlert: 1500, supplierId: suppliers[0].id, lastPrice: 18000, priceHistory: [{ price: 18000, date: new Date().toISOString() }] },
  ];
  const recipes = [
    {
      id: uid("rcp"),
      name: "Roti Coklat",
      yieldQty: 10,
      sellPrice: 8000, // sudah tidak dipakai (Resep tanpa harga), dibiarkan agar data lama tetap valid
      minFinishedStock: 5,
      finishedStock: 0,
      items: [
        { id: uid("ri"), rawMaterialId: rawMaterials[0].id, qty: 200, unitId: "gram" },
        { id: uid("ri"), rawMaterialId: rawMaterials[1].id, qty: 50, unitId: "gram" },
        { id: uid("ri"), rawMaterialId: rawMaterials[2].id, qty: 300, unitId: "ml" },
      ],
    },
  ];
  return { units: SEED_UNITS, suppliers, rawMaterials, recipes, batches: [], opnames: [], sales: [], purchases: [], pettyCash: [], auditLog: [], permissions: DEFAULT_PERMISSIONS, companyProfile: { name: "NAMA PERUSAHAAN ANDA", address: "Alamat perusahaan", phone: "08xx-xxxx-xxxx", email: "email@perusahaan.com", picName: "", terms: ["Mohon lampirkan invoice asli dan surat jalan saat pengiriman.", "Cantumkan nomor PO pada dokumen invoice.", "Item dalam PO tidak dapat diganti tanpa persetujuan tertulis.", "Biaya retur akibat ketidaksesuaian barang menjadi tanggung jawab supplier.", "Konfirmasi minimal H-1 jika pengiriman di luar jadwal yang disepakati."] } };
}

function convertToBase(qty, unit) {
  return qty * unit.toBase;
}

function StockGauge({ pct, danger }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = danger ? COLORS.alert : clamped < 40 ? COLORS.crimson : COLORS.success;
  return (
    <svg width="76" height="76" viewBox="0 0 100 100" style={danger ? { animation: "pulseGauge 1.4s ease-in-out infinite" } : undefined}>
      <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.border} strokeWidth="7" strokeDasharray="198 264" strokeDashoffset="-33" strokeLinecap="round" transform="rotate(135 50 50)" />
      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${(clamped / 100) * 198} 264`} strokeDashoffset="-33" strokeLinecap="round" transform="rotate(135 50 50)" style={{ transition: "stroke-dasharray 0.6s ease", filter: `drop-shadow(0 0 3px ${color})` }} />
      <text x="50" y="55" textAnchor="middle" fill={COLORS.ink} fontFamily="JetBrains Mono" fontSize="20" fontWeight="600">{Math.round(clamped)}</text>
      <text x="50" y="68" textAnchor="middle" fill={COLORS.muted} fontFamily="Inter" fontSize="8">% STOK</text>
    </svg>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "Inter", fontSize: 12, color: COLORS.muted }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  color: COLORS.ink,
  fontFamily: "Inter",
  fontSize: 14,
  outline: "none",
};

const btnPrimary = {
  background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.crimson})`,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 6,
  padding: "9px 16px",
  fontFamily: "Anton",
  fontWeight: 400,
  fontSize: 15,
  letterSpacing: 0.5,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  boxShadow: "0 2px 0 rgba(140,15,28,0.5)",
};

const btnGhost = {
  background: "transparent",
  color: COLORS.muted,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "8px 12px",
  fontFamily: "Inter",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [role, setRole] = useState(() => (supabase ? null : "super_admin"));
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [toast, setToast] = useState(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const saveTimer = useRef(null);

  function normalize(parsed) {
    return {
      sales: [],
      purchases: [],
      pettyCash: [],
      auditLog: [],
      permissions: DEFAULT_PERMISSIONS,
      companyProfile: { name: "NAMA PERUSAHAAN ANDA", address: "Alamat perusahaan", phone: "08xx-xxxx-xxxx", email: "email@perusahaan.com", picName: "", terms: ["Mohon lampirkan invoice asli dan surat jalan saat pengiriman.", "Cantumkan nomor PO pada dokumen invoice.", "Item dalam PO tidak dapat diganti tanpa persetujuan tertulis.", "Biaya retur akibat ketidaksesuaian barang menjadi tanggung jawab supplier.", "Konfirmasi minimal H-1 jika pengiriman di luar jadwal yang disepakati."] },
      ...parsed,
      recipes: (parsed.recipes || []).map((r) => ({ finishedStock: 0, minFinishedStock: 0, ...r })),
      rawMaterials: (parsed.rawMaterials || []).map((r) => ({ lastPrice: 0, priceHistory: [], ...r })),
      purchases: (parsed.purchases || []).map((p) => {
        let items = p.items || (p.rawMaterialId ? [{ rawMaterialId: p.rawMaterialId, name: p.name || "(bahan)", qty: p.qty, unitSymbol: p.unitSymbol, price: p.price }] : []);
        items = items.map((it) =>
          it.packCount != null ? it : { rawMaterialId: it.rawMaterialId, name: it.name, packSize: 1, packUnit: it.unitSymbol, packCount: it.qty, pricePerPack: it.price }
        );
        return { taxPercent: 0, shippingCost: 0, ...p, items };
      }),
      opnames: (parsed.opnames || []).map((o) => ({
        ...o,
        items: (o.items || []).map((it) => (it.itemType ? it : { itemType: "raw", refId: it.rawMaterialId, name: it.name, systemQty: it.systemQty, actualQty: it.actualQty, diff: it.diff })),
      })),
    };
  }

  function logAction(action, detail) {
    const actor = (supabase && session && session.user.email) || ROLES.find((r) => r.id === role)?.label || role;
    return { id: uid("log"), actor, action, detail, at: new Date().toISOString() };
  }

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      return;
    }
    (async () => {
      const { data: existing, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (existing) {
        setProfile(existing);
        if (existing.role) setRole(existing.role);
      } else if (!error) {
        const { data: created } = await supabase
          .from("profiles")
          .insert({ id: session.user.id, email: session.user.email })
          .select()
          .single();
        setProfile(created || null);
      }
    })();
  }, [session]);

  useEffect(() => {
    if (!authChecked) return;
    if (supabase && !session) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoadError(false);
      try {
        if (supabase) {
          const { data: row, error } = await supabase.from("app_state").select("data").eq("id", "main").single();
          if (error) throw error;
          const parsed = row && row.data && Object.keys(row.data).length ? row.data : seedData();
          setData(normalize(parsed));
          setDbConnected(true);
        } else {
          const raw = localStorage.getItem("possystem:data");
          const parsed = raw ? JSON.parse(raw) : seedData();
          setData(normalize(parsed));
        }
      } catch (e) {
        // PENTING: jangan fallback ke seedData/localStorage di sini kalau Supabase aktif.
        // Kalau data di-set ke sini, efek simpan-otomatis di bawah akan menimpa data
        // asli di server dengan data kosong/lama begitu koneksi gagal sesaat saja.
        // Jadi biarkan `data` tetap null, tampilkan layar error + tombol coba lagi.
        setLoadError(true);
        setDbConnected(false);
      }
      setLoading(false);
    })();
  }, [authChecked, session, retryCount]);

  useEffect(() => {
    if (!data) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (supabase) {
          const { error } = await supabase.from("app_state").update({ data, updated_at: new Date().toISOString() }).eq("id", "main");
          if (error) throw error;
        } else {
          localStorage.setItem("possystem:data", JSON.stringify(data));
        }
      } catch {
        showToast("Gagal menyimpan ke Supabase, perubahan disimpan lokal saja", true);
        localStorage.setItem("possystem:data", JSON.stringify(data));
      }
    }, 500);
  }, [data]);

  useEffect(() => {
    if (!data || !role) return;
    const allowed = role === "super_admin" ? MODULES.map((m) => m.id) : (data.permissions[role] || []);
    setTab((currentTab) => (allowed.includes(currentTab) || currentTab === "access" || currentTab === "users" ? currentTab : allowed[0] || "dashboard"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, data && data.permissions]);

  function showToast(msg, isError) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2200);
  }

  function unitById(id) {
    return data.units.find((u) => u.id === id);
  }
  function rmById(id) {
    return data.rawMaterials.find((r) => r.id === id);
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted, fontFamily: "Inter" }}>
        Memuat...
      </div>
    );
  }

  if (supabase && authChecked && !session) {
    return <LoginScreen />;
  }

  if (supabase && session && role === null) {
    return <PendingRoleScreen email={session.user.email} onLogout={() => supabase.auth.signOut()} hasProfile={!!profile} />;
  }

  if (loadError) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter" }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, maxWidth: 380, textAlign: "center" }}>
          <AlertTriangle size={32} color={COLORS.alert} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "Anton", fontSize: 20, color: COLORS.ink, marginBottom: 8 }}>GAGAL MEMUAT DATA</div>
          <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.6, marginBottom: 16 }}>
            Tidak bisa menyambung ke server. Ini bisa karena internet terputus atau server sedang lambat merespons.
            Data kamu di server AMAN dan tidak akan berubah — coba lagi setelah periksa koneksi internet.
          </div>
          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center" }} onClick={() => setRetryCount((c) => c + 1)}>
            <RotateCcw size={16} />Coba Lagi
          </button>
          {supabase && session && (
            <button style={{ ...btnGhost, width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => supabase.auth.signOut()}>Keluar</button>
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted, fontFamily: "Inter" }}>
        Memuat data...
      </div>
    );
  }

  const isSuperAdmin = role === "super_admin";
  const allowedModules = isSuperAdmin ? MODULES.map((m) => m.id) : (data.permissions[role] || []);
  const can = (id) => allowedModules.includes(id);

  const NAV_TREE = [
    { id: "dashboard", label: "Dasbor", icon: Gauge },
    {
      id: "salesorder", label: "Sales Order", icon: ShoppingCart,
      children: [can("pos") && { id: "pos", label: "Input Order" }, can("orderlist") && { id: "orderlist", label: "List Order" }].filter(Boolean),
    },
    {
      id: "stock", label: "Stock", icon: Package,
      children: [can("materials") && { id: "materials", label: "Bahan Baku" }, can("finishedgoods") && { id: "finishedgoods", label: "Barang Jadi" }, can("opname") && { id: "opname", label: "Stock Opname" }].filter(Boolean),
    },
    {
      id: "produksi", label: "Produksi", icon: Factory,
      children: [can("recipes") && { id: "recipes", label: "Resep" }, can("batchcreate") && { id: "batchcreate", label: "Buat Jadwal Produksi" }, can("batchlist") && { id: "batchlist", label: "List Antrean Produksi" }].filter(Boolean),
    },
    {
      id: "pembelian", label: "Pembelian", icon: Truck,
      children: [can("suppliers") && { id: "suppliers", label: "List Supplier" }, can("purchases") && { id: "purchases", label: "Buat PO" }].filter(Boolean),
    },
    { id: "pettycash", label: "Kas", icon: Wallet },
    {
      id: "pengaturan", label: "Pengaturan", icon: Settings,
      children: [
        supabase && session && { id: "profile", label: "Profil Saya" },
        can("units") && { id: "units", label: "Satuan" },
        can("audit") && { id: "audit", label: "Log Aktivitas" },
        isSuperAdmin && { id: "access", label: "Manajemen Akses" },
        isSuperAdmin && supabase && { id: "users", label: "Kelola Pengguna" },
      ].filter(Boolean),
    },
  ].filter((n) => (n.children ? n.children.length > 0 : can(n.id)));

  const activeGroup = NAV_TREE.find((n) => n.id === tab || (n.children && n.children.some((c) => c.id === tab)));
  const activeChildren = activeGroup?.children || null;

  function selectGroup(node) {
    if (node.children) {
      setTab(node.children[0].id);
    } else {
      setTab(node.id);
    }
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: 640, fontFamily: "Inter", color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <style>{FONT_IMPORT}{`
        @keyframes pulseGauge { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
        * { box-sizing: border-box; text-transform: uppercase; }
        input::placeholder { text-transform: uppercase; }
      `}</style>

      <header style={{ position: "relative", padding: "22px 20px 20px", overflow: "hidden", borderBottom: `3px solid ${COLORS.ink}` }}>
        <div style={{ position: "absolute", top: "-20%", left: "-8%", width: "78%", height: "140%", background: `linear-gradient(135deg, ${COLORS.orange} 0%, ${COLORS.crimson} 100%)`, transform: "skewX(-10deg)", boxShadow: "6px 0 0 rgba(0,0,0,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Logo" style={{ height: 44, width: "auto", flexShrink: 0, filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }} />
            <div>
              <div style={{ fontFamily: "Anton", fontSize: 24, letterSpacing: 1, color: "#FFFFFF", textShadow: "2px 2px 0 rgba(0,0,0,0.25)" }}>
                RUANG KONTROL PRODUKSI
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3, fontWeight: 600 }}>Master Data · Stok · Resep · Batch · Opname</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: dbConnected ? COLORS.success : COLORS.muted, background: "#FFFFFF", padding: "5px 9px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              {dbConnected ? "● Online" : "○ Offline"}
            </span>
            {supabase && session ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: COLORS.ink, fontFamily: "Inter", background: "#FFFFFF", padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                <ShieldCheck size={14} color={COLORS.crimson} />
                <span>{session.user.email} · <b style={{ color: COLORS.crimson }}>{ROLES.find((r) => r.id === role)?.label || role}</b></span>
                <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Keluar</button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.ink, fontFamily: "Inter", background: "#FFFFFF", padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                <ShieldCheck size={14} color={COLORS.crimson} />
                Login sebagai (demo)
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, border: "none", background: "transparent" }}>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      </header>

      <nav style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.panel }}>
        {NAV_TREE.map((n) => {
          const Icon = n.icon;
          const active = activeGroup?.id === n.id;
          return (
            <button
              key={n.id}
              onClick={() => selectGroup(n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                borderBottom: active ? `2px solid ${COLORS.crimson}` : "2px solid transparent",
                color: active ? COLORS.crimson : COLORS.muted,
                fontFamily: "Anton",
                fontWeight: 600,
                fontSize: 15,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              <Icon size={16} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {activeChildren && activeChildren.length > 0 && (
        <nav style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.panelLight }}>
          {activeChildren.map((c) => {
            const active = tab === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setTab(c.id)}
                style={{
                  padding: "9px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? `2px solid ${COLORS.crimson}` : "2px solid transparent",
                  color: active ? COLORS.crimson : COLORS.muted,
                  fontFamily: "Inter",
                  fontWeight: active ? 600 : 500,
                  fontSize: 12.5,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </nav>
      )}

      <main style={{ padding: 18, flex: 1 }}>
        {tab === "dashboard" && <Dashboard data={data} unitById={unitById} role={role} />}
        {tab === "units" && <UnitsPanel data={data} setData={setData} showToast={showToast} />}
        {tab === "materials" && <MaterialsPanel data={data} setData={setData} unitById={unitById} showToast={showToast} />}
        {tab === "finishedgoods" && <FinishedGoodsPanel data={data} setData={setData} logAction={logAction} showToast={showToast} />}
        {tab === "suppliers" && <SuppliersPanel data={data} setData={setData} showToast={showToast} />}
        {tab === "purchases" && <PurchasesPanel data={data} setData={setData} unitById={unitById} logAction={logAction} showToast={showToast} />}
        {tab === "recipes" && <RecipesPanel data={data} setData={setData} unitById={unitById} rmById={rmById} showToast={showToast} />}
        {tab === "batchcreate" && <BatchCreatePanel data={data} setData={setData} unitById={unitById} rmById={rmById} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "batchlist" && <BatchListPanel data={data} setData={setData} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "opname" && <OpnamePanel data={data} setData={setData} unitById={unitById} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "pos" && <PosPanel data={data} setData={setData} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "orderlist" && <OrderListPanel data={data} setData={setData} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "pettycash" && <PettyCashPanel data={data} setData={setData} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "access" && <AccessPanel data={data} setData={setData} logAction={logAction} showToast={showToast} />}
        {tab === "users" && <UsersPanel showToast={showToast} />}
        {tab === "profile" && <ProfilePanel session={session} showToast={showToast} />}
        {tab === "audit" && <AuditLogPanel data={data} />}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.isError ? COLORS.alert : COLORS.success, color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "Inter", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h2 style={{ fontFamily: "Anton", fontWeight: 700, fontSize: 20, letterSpacing: 0.5, margin: 0, color: COLORS.ink }}>{children}</h2>
      {action}
    </div>
  );
}

function Dashboard({ data, unitById, role }) {
  const finishedStockData = data.recipes.map((r) => ({ name: r.name, qty: r.finishedStock || 0, min: r.minFinishedStock || 0 }));
  const orders = (data.sales || []).map((o) => ({ ...o, status: o.status || "masuk" }));
  const orderCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s.id] = orders.filter((o) => o.status === s.id).length;
    return acc;
  }, {});

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  function recapBySku(monthKey) {
    const map = {};
    orders.forEach((o) => {
      if (!o.createdAt || o.createdAt.slice(0, 7) !== monthKey) return;
      o.items.forEach((it) => {
        map[it.name] = (map[it.name] || 0) + it.qty;
      });
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, qty]) => ({ name, qty }));
  }

  const thisMonthRecap = recapBySku(thisMonthKey);
  const lastMonthRecap = recapBySku(lastMonthKey);
  const monthLabel = (key) => {
    const [y, m] = key.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <div>
      <SectionTitle>Rekap Penjualan per SKU</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 22 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "Anton", fontSize: 14, marginBottom: 8 }}>Bulan Lalu — {monthLabel(lastMonthKey)}</div>
          {lastMonthRecap.length === 0 ? <EmptyState text="Belum ada penjualan bulan lalu." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {lastMonthRecap.map((r) => (
                <div key={r.name} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.muted }}>{r.name}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: COLORS.ink }}>{r.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: "Anton", fontSize: 14, marginBottom: 8 }}>Bulan Ini (Berjalan) — {monthLabel(thisMonthKey)}</div>
          {thisMonthRecap.length === 0 ? <EmptyState text="Belum ada penjualan bulan ini." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {thisMonthRecap.map((r) => (
                <div key={r.name} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.muted }}>{r.name}</span>
                  <span style={{ fontFamily: "JetBrains Mono", color: COLORS.crimson }}>{r.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SectionTitle>Antrian Order</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 22 }}>
        {ORDER_STATUSES.map((s) => (
          <div key={s.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11.5, color: COLORS.muted }}>{s.label}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 26, fontWeight: 600, color: COLORS.crimson }}>{orderCounts[s.id] || 0}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Stok Produk Jadi</SectionTitle>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 22 }}>
        {finishedStockData.length === 0 ? <EmptyState text="Belum ada resep/produk jadi." /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={finishedStockData}>
              <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} width={30} />
              <Tooltip contentStyle={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }} />
              <Bar dataKey="qty" fill={COLORS.crimson} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <SectionTitle>Alarm Stok Produk Jadi</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12, marginBottom: 22 }}>
        {data.recipes.map((r) => {
          const min = r.minFinishedStock || 0;
          const pct = min > 0 ? ((r.finishedStock || 0) / (min * 3)) * 100 : 100;
          const danger = min > 0 && (r.finishedStock || 0) <= min;
          return (
            <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${danger ? COLORS.alert : COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <StockGauge pct={pct} danger={danger} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{r.name}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.ink, marginTop: 2 }}>
                  {(r.finishedStock || 0).toLocaleString("id-ID")} unit
                </div>
                <div style={{ fontSize: 11, color: danger ? COLORS.alert : COLORS.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  {danger ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                  {min === 0 ? "Belum ada min. stok" : danger ? "Di bawah batas minimum" : "Stok aman"}
                </div>
              </div>
            </div>
          );
        })}
        {data.recipes.length === 0 && <EmptyState text="Belum ada resep/produk jadi." />}
      </div>

      <SectionTitle>Status Stok Bahan Baku</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
        {data.rawMaterials.map((rm) => {
          const base = unitById(rm.baseUnitId);
          const pct = rm.minAlert > 0 ? (rm.stock / (rm.minAlert * 3)) * 100 : 100;
          const danger = rm.stock <= rm.minAlert;
          return (
            <div key={rm.id} style={{ background: COLORS.panel, border: `1px solid ${danger ? COLORS.alert : COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <StockGauge pct={pct} danger={danger} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{rm.name}</div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.ink, marginTop: 2 }}>
                  {rm.stock.toLocaleString("id-ID")} {base?.symbol}
                </div>
                <div style={{ fontSize: 11, color: danger ? COLORS.alert : COLORS.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  {danger ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                  {danger ? "Di bawah batas minimum" : "Stok aman"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {data.rawMaterials.length === 0 && <EmptyState text="Belum ada bahan baku. Tambahkan di menu Bahan Baku." />}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ color: COLORS.muted, fontSize: 13, padding: "24px 0", textAlign: "center", border: `1px dashed ${COLORS.border}`, borderRadius: 10 }}>{text}</div>;
}

function UnitsPanel({ data, setData, showToast }) {
  const [form, setForm] = useState({ name: "", symbol: "", type: "berat", toBase: "" });

  function addUnit() {
    if (!form.name || !form.symbol || !form.toBase) return showToast("Lengkapi semua field satuan", true);
    const newUnit = { id: uid("unit"), name: form.name, symbol: form.symbol, type: form.type, toBase: parseFloat(form.toBase) };
    setData({ ...data, units: [...data.units, newUnit] });
    setForm({ name: "", symbol: "", type: "berat", toBase: "" });
    showToast("Satuan ditambahkan");
  }

  function removeUnit(id) {
    const used = data.rawMaterials.some((r) => r.baseUnitId === id || r.purchaseUnitId === id) || data.recipes.some((rc) => rc.items.some((i) => i.unitId === id));
    if (used) return showToast("Satuan sedang dipakai, tidak bisa dihapus", true);
    setData({ ...data, units: data.units.filter((u) => u.id !== id) });
  }

  return (
    <div>
      <SectionTitle>Satuan &amp; Konversi</SectionTitle>
      <p style={{ color: COLORS.muted, fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>
        Semua stok disimpan dalam satuan dasar per tipe (contoh: gram untuk berat, ml untuk volume) agar konversi selalu konsisten.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        {data.units.map((u) => (
          <div key={u.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10, position: "relative" }}>
            <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15 }}>{u.name} ({u.symbol})</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>{TYPE_LABEL[u.type]} · 1 {u.symbol} = {u.toBase} x satuan dasar</div>
            <button onClick={() => removeUnit(u.id)} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}><X size={14} /></button>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Nama satuan">
          <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="mis. Ons" />
        </Field>
        <Field label="Simbol">
          <input style={inputStyle} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="ons" />
        </Field>
        <Field label="Tipe">
          <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="berat">Berat</option>
            <option value="volume">Volume</option>
            <option value="satuan">Satuan</option>
          </select>
        </Field>
        <Field label="Konversi ke satuan dasar">
          <input style={inputStyle} type="number" value={form.toBase} onChange={(e) => setForm({ ...form, toBase: e.target.value })} placeholder="mis. 100" />
        </Field>
        <button style={btnPrimary} onClick={addUnit}><Plus size={16} />Tambah</button>
      </div>
    </div>
  );
}

function MaterialsPanel({ data, setData, unitById, showToast }) {
  const emptyForm = { code: "", name: "", baseUnitId: "gram", purchaseUnitId: "kg", stock: "", minAlert: "", supplierId: "" };
  const [form, setForm] = useState(emptyForm);

  function addMaterial() {
    if (!form.code || !form.name || !form.stock) return showToast("Lengkapi kode, nama, dan stok awal", true);
    const rm = { id: uid("rm"), code: form.code, name: form.name, baseUnitId: form.baseUnitId, purchaseUnitId: form.purchaseUnitId, stock: parseFloat(form.stock) || 0, minAlert: parseFloat(form.minAlert) || 0, supplierId: form.supplierId || null };
    setData({ ...data, rawMaterials: [...data.rawMaterials, rm] });
    setForm(emptyForm);
    showToast("Bahan baku ditambahkan");
  }

  function removeMaterial(id) {
    const used = data.recipes.some((rc) => rc.items.some((i) => i.rawMaterialId === id));
    if (used) return showToast("Dipakai di resep, tidak bisa dihapus", true);
    setData({ ...data, rawMaterials: data.rawMaterials.filter((r) => r.id !== id) });
  }

  const baseUnits = data.units.filter((u) => u.toBase === 1);

  function buildStockExportRows() {
    return data.rawMaterials.map((rm) => {
      const base = unitById(rm.baseUnitId);
      const purchase = unitById(rm.purchaseUnitId);
      const sup = data.suppliers.find((s) => s.id === rm.supplierId);
      const costPerBase = purchase && purchase.toBase ? (rm.lastPrice || 0) / purchase.toBase : 0;
      return {
        Kode: rm.code,
        Nama: rm.name,
        Stok: rm.stock,
        Satuan: base?.symbol,
        "Min. Stok": rm.minAlert,
        Supplier: sup?.name || "-",
        "Harga Terakhir/Satuan Beli": rm.lastPrice || 0,
        "Nilai Stok (Rp)": Math.round(rm.stock * costPerBase),
      };
    });
  }

  return (
    <div>
      <SectionTitle>Bahan Baku</SectionTitle>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <button style={btnGhost} onClick={() => exportExcel("stok-bahan-baku", buildStockExportRows())}><Download size={14} />Excel</button>
        <button style={btnGhost} onClick={() => exportPDF("stok-bahan-baku", "Laporan Stok Bahan Baku (Snapshot Saat Ini)", buildStockExportRows())}><Download size={14} />PDF</button>
      </div>
      <p style={{ color: COLORS.muted, fontSize: 11.5, marginTop: -8, marginBottom: 14 }}>
        Catatan: laporan ini adalah snapshot stok saat ini (bukan riwayat per tanggal), karena stok bahan baku adalah angka yang selalu berubah, bukan data bertanggal.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {data.rawMaterials.map((rm) => {
          const base = unitById(rm.baseUnitId);
          const purchase = unitById(rm.purchaseUnitId);
          const sup = data.suppliers.find((s) => s.id === rm.supplierId);
          return (
            <div key={rm.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{rm.name} <span style={{ color: COLORS.muted, fontSize: 12 }}>({rm.code})</span></div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Stok: <span style={{ fontFamily: "JetBrains Mono", color: COLORS.ink }}>{rm.stock.toLocaleString("id-ID")} {base?.symbol}</span> · Beli dalam {purchase?.name} · Min: {rm.minAlert} {base?.symbol} {sup ? `· ${sup.name}` : ""}
                </div>
              </div>
              <button onClick={() => removeMaterial(rm.id)} style={btnGhost}><Trash2 size={14} />Hapus</button>
            </div>
          );
        })}
        {data.rawMaterials.length === 0 && <EmptyState text="Belum ada bahan baku." />}
      </div>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Kode"><input style={{ ...inputStyle, width: 90 }} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
        <Field label="Nama"><input style={{ ...inputStyle, width: 150 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Satuan dasar (stok)">
          <select style={inputStyle} value={form.baseUnitId} onChange={(e) => setForm({ ...form, baseUnitId: e.target.value })}>
            {baseUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Satuan beli">
          <select style={inputStyle} value={form.purchaseUnitId} onChange={(e) => setForm({ ...form, purchaseUnitId: e.target.value })}>
            {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Stok awal"><input style={{ ...inputStyle, width: 100 }} type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
        <Field label="Min. stok"><input style={{ ...inputStyle, width: 100 }} type="number" value={form.minAlert} onChange={(e) => setForm({ ...form, minAlert: e.target.value })} /></Field>
        <Field label="Supplier">
          <select style={inputStyle} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">-</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <button style={btnPrimary} onClick={addMaterial}><Plus size={16} />Tambah</button>
      </div>
    </div>
  );
}

function SuppliersPanel({ data, setData, showToast }) {
  const [form, setForm] = useState({ name: "", phone: "", contactPerson: "", address: "" });

  function add() {
    if (!form.name) return showToast("Nama supplier wajib diisi", true);
    setData({ ...data, suppliers: [...data.suppliers, { id: uid("sup"), name: form.name, phone: form.phone, contactPerson: form.contactPerson, address: form.address }] });
    setForm({ name: "", phone: "", contactPerson: "", address: "" });
    showToast("Supplier ditambahkan");
  }
  function remove(id) {
    const used = data.rawMaterials.some((r) => r.supplierId === id);
    if (used) return showToast("Supplier dipakai bahan baku, tidak bisa dihapus", true);
    setData({ ...data, suppliers: data.suppliers.filter((s) => s.id !== id) });
  }

  return (
    <div>
      <SectionTitle>List Supplier</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {data.suppliers.map((s) => (
          <div key={s.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{s.contactPerson ? `${s.contactPerson} · ` : ""}{s.phone || "-"}</div>
              {s.address && <div style={{ fontSize: 11.5, color: COLORS.muted }}>{s.address}</div>}
            </div>
            <button onClick={() => remove(s.id)} style={btnGhost}><Trash2 size={14} />Hapus</button>
          </div>
        ))}
        {data.suppliers.length === 0 && <EmptyState text="Belum ada supplier." />}
      </div>
      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Nama supplier"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Kontak person"><input style={inputStyle} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="mis. Bpk. Denny" /></Field>
        <Field label="Telepon"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Alamat"><input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <button style={btnPrimary} onClick={add}><Plus size={16} />Tambah</button>
      </div>
    </div>
  );
}

function RecipesPanel({ data, setData, unitById, rmById, showToast }) {
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("");
  const [minFinishedStock, setMinFinishedStock] = useState("");
  const [items, setItems] = useState([{ id: uid("ri"), rawMaterialId: data.rawMaterials[0]?.id || "", qty: "", unitId: data.units[0]?.id || "" }]);

  function addItemRow() {
    setItems([...items, { id: uid("ri"), rawMaterialId: data.rawMaterials[0]?.id || "", qty: "", unitId: data.units[0]?.id || "" }]);
  }
  function updateItem(id, patch) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id) {
    setItems(items.filter((i) => i.id !== id));
  }

  function saveRecipe() {
    if (!name || !yieldQty || items.length === 0) return showToast("Lengkapi nama, yield, dan minimal 1 bahan baku", true);
    for (const it of items) {
      if (!it.rawMaterialId || !it.qty || !it.unitId) return showToast("Setiap item harus punya bahan baku, qty, dan satuan", true);
      const rm = rmById(it.rawMaterialId);
      const itemUnit = unitById(it.unitId);
      const rmBaseUnit = unitById(rm.baseUnitId);
      if (itemUnit.type !== rmBaseUnit.type) return showToast(`Satuan untuk ${rm.name} tidak sesuai tipe (harus ${TYPE_LABEL[rmBaseUnit.type]})`, true);
    }
    const recipe = { id: uid("rcp"), name, yieldQty: parseFloat(yieldQty), minFinishedStock: parseFloat(minFinishedStock) || 0, finishedStock: 0, items: items.map((i) => ({ ...i, qty: parseFloat(i.qty) })) };
    setData({ ...data, recipes: [...data.recipes, recipe] });
    setName(""); setYieldQty(""); setMinFinishedStock("");
    setItems([{ id: uid("ri"), rawMaterialId: data.rawMaterials[0]?.id || "", qty: "", unitId: data.units[0]?.id || "" }]);
    showToast("Resep disimpan");
  }

  function removeRecipe(id) {
    setData({ ...data, recipes: data.recipes.filter((r) => r.id !== id) });
  }

  function forecastFor(recipe) {
    if (recipe.items.length === 0) return 0;
    let maxBuild = Infinity;
    for (const it of recipe.items) {
      const rm = rmById(it.rawMaterialId);
      if (!rm) return 0;
      const itemUnit = unitById(it.unitId);
      const neededPerYield = convertToBase(it.qty, itemUnit);
      if (neededPerYield <= 0) continue;
      const buildable = Math.floor(rm.stock / neededPerYield);
      maxBuild = Math.min(maxBuild, buildable);
    }
    return maxBuild === Infinity ? 0 : maxBuild * recipe.yieldQty;
  }

  // Kalkulator HPP: dihitung langsung dari harga bahan baku terakhir (dari PO terakhir),
  // bukan menunggu ada batch yang selesai. Jadi selalu tersedia begitu ada harga PO.
  function calcHppPerUnit(recipe) {
    if (!recipe.yieldQty) return 0;
    let totalCost = 0;
    for (const it of recipe.items) {
      const rm = rmById(it.rawMaterialId);
      if (!rm) continue;
      const itemUnit = unitById(it.unitId);
      const purchaseUnit = unitById(rm.purchaseUnitId);
      const neededBase = convertToBase(it.qty, itemUnit);
      const costPerBase = purchaseUnit && purchaseUnit.toBase ? (rm.lastPrice || 0) / purchaseUnit.toBase : 0;
      totalCost += neededBase * costPerBase;
    }
    return totalCost / recipe.yieldQty;
  }

  return (
    <div>
      <SectionTitle>Resep</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {data.recipes.map((r) => {
          const hppEstimate = calcHppPerUnit(r);
          return (
            <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div>
                <div style={{ fontFamily: "Anton", fontWeight: 700, fontSize: 18 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>1 batch resep = {r.yieldQty} unit · Stok jadi: {r.finishedStock || 0} · Min stok: {r.minFinishedStock || 0}</div>
                <div style={{ fontSize: 12, color: COLORS.crimson, marginTop: 3, fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 4 }}>
                  <Calculator size={13} /> Estimasi HPP: Rp{Math.round(hppEstimate).toLocaleString("id-ID")}/unit
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {r.items.map((it) => {
                  const rm = rmById(it.rawMaterialId);
                  const u = unitById(it.unitId);
                  return (
                    <div key={it.id} style={{ fontSize: 12.5, color: COLORS.muted, display: "flex", justifyContent: "space-between" }}>
                      <span>{rm?.name || "(bahan dihapus)"}</span>
                      <span style={{ fontFamily: "JetBrains Mono", color: COLORS.ink }}>{it.qty} {u?.symbol}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => removeRecipe(r.id)} style={{ ...btnGhost, marginTop: 10 }}><Trash2 size={14} />Hapus resep</button>
            </div>
          );
        })}
        {data.recipes.length === 0 && <EmptyState text="Belum ada resep." />}
      </div>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Buat Resep Baru</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <Field label="Nama produk / resep"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Roti Coklat" /></Field>
          <Field label="Yield (unit per batch resep)"><input style={{ ...inputStyle, width: 100 }} type="number" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} placeholder="10" /></Field>
          <Field label="Min. stok produk jadi (alarm)"><input style={{ ...inputStyle, width: 100 }} type="number" value={minFinishedStock} onChange={(e) => setMinFinishedStock(e.target.value)} placeholder="5" /></Field>
        </div>

        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Bahan baku (harus dipilih dari yang sudah ada)</div>
        {data.rawMaterials.length === 0 ? (
          <EmptyState text="Tambahkan bahan baku terlebih dahulu di menu Bahan Baku." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select style={{ ...inputStyle, flex: "1 1 160px" }} value={it.rawMaterialId} onChange={(e) => updateItem(it.id, { rawMaterialId: e.target.value })}>
                  {data.rawMaterials.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                </select>
                <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="Qty" value={it.qty} onChange={(e) => updateItem(it.id, { qty: e.target.value })} />
                <select style={{ ...inputStyle, width: 100 }} value={it.unitId} onChange={(e) => updateItem(it.id, { unitId: e.target.value })}>
                  {data.units.map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                </select>
                <button onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost} onClick={addItemRow}><Plus size={14} />Tambah bahan</button>
          <button style={btnPrimary} onClick={saveRecipe}><Save size={16} />Simpan Resep</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    planned: { c: COLORS.crimson, t: "Direncanakan" },
    completed: { c: COLORS.success, t: "Selesai" },
    pending: { c: COLORS.crimson, t: "Menunggu Persetujuan" },
    approved: { c: COLORS.success, t: "Disetujui" },
    rejected: { c: COLORS.alert, t: "Ditolak" },
  };
  const s = map[status] || { c: COLORS.muted, t: status };
  return (
    <span style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, color: s.c, border: `1px solid ${s.c}`, borderRadius: 20, padding: "2px 10px" }}>
      {s.t}
    </span>
  );
}

function BatchCreatePanel({ data, setData, unitById, rmById, role, logAction, showToast }) {
  const allowed = canManageBatch(role);
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id || "");
  const [multiplier, setMultiplier] = useState("1");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));

  const recipe = data.recipes.find((r) => r.id === recipeId);

  function requiredItems(rc, mult) {
    return rc.items.map((it) => {
      const unit = unitById(it.unitId);
      const rm = rmById(it.rawMaterialId);
      const neededBase = convertToBase(it.qty, unit) * mult;
      const purchaseUnit = unitById(rm?.purchaseUnitId);
      const costPerBase = purchaseUnit && purchaseUnit.toBase ? (rm?.lastPrice || 0) / purchaseUnit.toBase : 0;
      const lineCost = neededBase * costPerBase;
      return { rawMaterialId: it.rawMaterialId, name: rm?.name, neededBase, baseSymbol: unitById(rm?.baseUnitId)?.symbol, available: rm?.stock ?? 0, lineCost };
    });
  }

  function createBatch() {
    if (!allowed) return showToast("Hanya Produksi/Super Admin yang bisa membuat batch", true);
    if (!recipe) return showToast("Pilih resep dulu", true);
    const mult = parseFloat(multiplier);
    if (!mult || mult <= 0) return showToast("Jumlah batch tidak valid", true);
    const items = requiredItems(recipe, mult);
    const batch = {
      id: uid("batch"),
      batchNumber: "BATCH-" + Date.now().toString().slice(-8),
      recipeId: recipe.id,
      recipeName: recipe.name,
      multiplier: mult,
      scheduledDate,
      plannedOutput: mult * recipe.yieldQty,
      actualOutput: null,
      rejectQty: 0,
      status: "planned",
      items,
      createdAt: new Date().toISOString(),
    };
    setData({
      ...data,
      batches: [batch, ...data.batches],
      auditLog: [logAction("Buat Jadwal Produksi", `${batch.batchNumber} · ${batch.recipeName}`), ...(data.auditLog || [])].slice(0, 200),
    });
    setMultiplier("1");
    showToast("Jadwal produksi dibuat: " + batch.batchNumber);
  }

  return (
    <div>
      <SectionTitle>Buat Jadwal Produksi</SectionTitle>
      {!allowed && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>Login sebagai Produksi atau Super Admin untuk membuat jadwal produksi.</div>}

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Resep">
          <select style={inputStyle} value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            {data.recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Jumlah batch (kelipatan resep)"><input style={{ ...inputStyle, width: 100 }} type="number" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></Field>
        <Field label="Tanggal jadwal produksi"><input style={inputStyle} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></Field>
        {recipe && <div style={{ fontSize: 12, color: COLORS.muted }}>Output rencana: <b style={{ color: COLORS.ink }}>{(parseFloat(multiplier) || 0) * recipe.yieldQty}</b> unit</div>}
        <button style={btnPrimary} onClick={createBatch} disabled={!allowed}><Plus size={16} />Buat Jadwal</button>
      </div>
    </div>
  );
}

function BatchListPanel({ data, setData, role, logAction, showToast }) {
  const allowed = canManageBatch(role);
  const [finishing, setFinishing] = useState(null); // batch id being finished
  const [actualOutput, setActualOutput] = useState("");
  const [rejectQty, setRejectQty] = useState("0");

  function startFinish(batch) {
    setFinishing(batch.id);
    setActualOutput(String(batch.plannedOutput));
    setRejectQty("0");
  }

  function completeBatch(batch) {
    if (!allowed) return showToast("Hanya Produksi/Super Admin yang bisa menyelesaikan batch", true);
    const insufficient = batch.items.find((it) => it.available < it.neededBase);
    if (insufficient) return showToast(`Stok ${insufficient.name} tidak cukup untuk batch ini`, true);

    const updatedMaterials = data.rawMaterials.map((rm) => {
      const used = batch.items.find((it) => it.rawMaterialId === rm.id);
      return used ? { ...rm, stock: rm.stock - used.neededBase } : rm;
    });
    const goodOutput = (parseFloat(actualOutput) || 0) - (parseFloat(rejectQty) || 0);
    const updatedRecipes = data.recipes.map((r) => (r.id === batch.recipeId ? { ...r, finishedStock: (r.finishedStock || 0) + Math.max(0, goodOutput) } : r));
    const hppTotal = batch.items.reduce((sum, it) => sum + (it.lineCost || 0), 0);
    const hppPerUnit = goodOutput > 0 ? hppTotal / goodOutput : 0;
    const updatedBatches = data.batches.map((b) =>
      b.id === batch.id
        ? { ...b, status: "completed", actualOutput: parseFloat(actualOutput) || 0, rejectQty: parseFloat(rejectQty) || 0, hppTotal, hppPerUnit, finishedAt: new Date().toISOString() }
        : b
    );
    setData({
      ...data,
      rawMaterials: updatedMaterials,
      recipes: updatedRecipes,
      batches: updatedBatches,
      auditLog: [logAction("Selesaikan Batch", `${batch.batchNumber} (${batch.recipeName}) · HPP Rp${Math.round(hppTotal).toLocaleString("id-ID")}`), ...(data.auditLog || [])].slice(0, 200),
    });
    setFinishing(null);
    showToast("Batch selesai, HPP Rp" + Math.round(hppTotal).toLocaleString("id-ID") + " total");
  }

  function deleteBatch(id) {
    setData({ ...data, batches: data.batches.filter((b) => b.id !== id) });
  }

  return (
    <div>
      <SectionTitle>List Antrean Produksi</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.batches.map((b) => (
          <div key={b.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{b.batchNumber}</div>
                <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{b.recipeName} · x{b.multiplier}</div>
                {b.scheduledDate && <div style={{ fontSize: 11.5, color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><CalendarDays size={12} />{new Date(b.scheduledDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>}
              </div>
              <StatusBadge status={b.status} />
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {b.items.map((it, idx) => (
                <div key={idx} style={{ fontSize: 12, color: it.available < it.neededBase ? COLORS.alert : COLORS.muted, display: "flex", justifyContent: "space-between" }}>
                  <span>{it.name}</span>
                  <span style={{ fontFamily: "JetBrains Mono" }}>{it.neededBase.toLocaleString("id-ID")} {it.baseSymbol}</span>
                </div>
              ))}
            </div>
            {b.status === "completed" && (
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
                Output aktual: <b style={{ color: COLORS.ink }}>{b.actualOutput}</b> unit · Reject: <b style={{ color: COLORS.alert }}>{b.rejectQty}</b>
                {b.hppTotal != null && (
                  <div style={{ marginTop: 4, color: COLORS.crimson, fontFamily: "JetBrains Mono", fontWeight: 600 }}>
                    HPP: Rp{Math.round(b.hppTotal).toLocaleString("id-ID")} total · Rp{Math.round(b.hppPerUnit || 0).toLocaleString("id-ID")}/unit
                  </div>
                )}
              </div>
            )}
            {b.status === "planned" && allowed && finishing !== b.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={btnPrimary} onClick={() => startFinish(b)}><CheckCircle2 size={15} />Selesaikan Batch</button>
                <button style={btnGhost} onClick={() => deleteBatch(b.id)}><Trash2 size={14} />Hapus</button>
              </div>
            )}
            {finishing === b.id && (
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Field label="Output aktual (unit)"><input style={{ ...inputStyle, width: 100 }} type="number" value={actualOutput} onChange={(e) => setActualOutput(e.target.value)} /></Field>
                <Field label="Jumlah reject/gagal"><input style={{ ...inputStyle, width: 100 }} type="number" value={rejectQty} onChange={(e) => setRejectQty(e.target.value)} /></Field>
                <button style={btnPrimary} onClick={() => completeBatch(b)}><Save size={15} />Konfirmasi</button>
                <button style={btnGhost} onClick={() => setFinishing(null)}><X size={14} />Batal</button>
              </div>
            )}
          </div>
        ))}
        {data.batches.length === 0 && <EmptyState text="Belum ada jadwal produksi." />}
      </div>
    </div>
  );
}

function OpnamePanel({ data, setData, unitById, role, logAction, showToast }) {
  const canInput = canInputOpname(role);
  const canApp = canApprove(role);
  const [draft, setDraft] = useState({}); // key: "raw:<id>" atau "finished:<id>"

  function submitOpname() {
    if (!canInput) return showToast("Hanya Warehouse/Produksi/Super Admin yang bisa input opname", true);
    const entries = Object.entries(draft).filter(([, v]) => v !== "" && v !== undefined);
    if (entries.length === 0) return showToast("Isi minimal satu jumlah fisik", true);
    const items = entries.map(([key, val]) => {
      const [itemType, refId] = key.split(":");
      if (itemType === "raw") {
        const rm = data.rawMaterials.find((r) => r.id === refId);
        return { itemType, refId, name: rm.name, systemQty: rm.stock, actualQty: parseFloat(val), diff: parseFloat(val) - rm.stock };
      } else {
        const r = data.recipes.find((x) => x.id === refId);
        return { itemType, refId, name: r.name, systemQty: r.finishedStock || 0, actualQty: parseFloat(val), diff: parseFloat(val) - (r.finishedStock || 0) };
      }
    });
    const opname = { id: uid("opn"), opnameNumber: "OPN-" + Date.now().toString().slice(-8), status: "pending", items, createdBy: role, createdAt: new Date().toISOString() };
    setData({ ...data, opnames: [opname, ...data.opnames], auditLog: [logAction("Ajukan Stock Opname", opname.opnameNumber), ...(data.auditLog || [])].slice(0, 200) });
    setDraft({});
    showToast("Opname diajukan, menunggu persetujuan manager");
  }

  function decide(opname, approve) {
    if (!canApp) return showToast("Hanya Manager/Super Admin yang bisa menyetujui", true);
    if (approve) {
      const updatedMaterials = data.rawMaterials.map((rm) => {
        const it = opname.items.find((i) => i.itemType === "raw" && i.refId === rm.id);
        return it ? { ...rm, stock: it.actualQty } : rm;
      });
      const updatedRecipes = data.recipes.map((r) => {
        const it = opname.items.find((i) => i.itemType === "finished" && i.refId === r.id);
        return it ? { ...r, finishedStock: it.actualQty } : r;
      });
      const updatedOpnames = data.opnames.map((o) => (o.id === opname.id ? { ...o, status: "approved", approvedBy: role, approvedAt: new Date().toISOString() } : o));
      setData({
        ...data,
        rawMaterials: updatedMaterials,
        recipes: updatedRecipes,
        opnames: updatedOpnames,
        auditLog: [logAction("Setujui Stock Opname", opname.opnameNumber), ...(data.auditLog || [])].slice(0, 200),
      });
      showToast("Opname disetujui, stok diperbarui");
    } else {
      const updatedOpnames = data.opnames.map((o) => (o.id === opname.id ? { ...o, status: "rejected", approvedBy: role, approvedAt: new Date().toISOString() } : o));
      setData({ ...data, opnames: updatedOpnames, auditLog: [logAction("Tolak Stock Opname", opname.opnameNumber), ...(data.auditLog || [])].slice(0, 200) });
      showToast("Opname ditolak");
    }
  }

  return (
    <div>
      <SectionTitle>Stock Opname</SectionTitle>
      {!canInput && !canApp && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>Role Sales tidak punya akses ke stock opname.</div>}

      {canInput && (
        <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Input Hitung Fisik — Bahan Baku</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {data.rawMaterials.map((rm) => {
              const base = unitById(rm.baseUnitId);
              const key = `raw:${rm.id}`;
              return (
                <div key={rm.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13 }}>{rm.name} <span style={{ color: COLORS.muted, fontSize: 11 }}>(sistem: {rm.stock.toLocaleString("id-ID")} {base?.symbol})</span></div>
                  <input style={{ ...inputStyle, width: 120 }} type="number" placeholder={`Jumlah fisik (${base?.symbol})`} value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                </div>
              );
            })}
            {data.rawMaterials.length === 0 && <EmptyState text="Belum ada bahan baku." />}
          </div>

          <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Input Hitung Fisik — Barang Jadi</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.recipes.map((r) => {
              const key = `finished:${r.id}`;
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13 }}>{r.name} <span style={{ color: COLORS.muted, fontSize: 11 }}>(sistem: {(r.finishedStock || 0).toLocaleString("id-ID")} unit)</span></div>
                  <input style={{ ...inputStyle, width: 120 }} type="number" placeholder="Jumlah fisik (unit)" value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                </div>
              );
            })}
            {data.recipes.length === 0 && <EmptyState text="Belum ada produk/resep." />}
          </div>

          <button style={{ ...btnPrimary, marginTop: 12 }} onClick={submitOpname}><Save size={16} />Ajukan Opname</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.opnames.map((o) => (
          <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{o.opnameNumber}</div>
              <StatusBadge status={o.status} />
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {o.items.map((it, idx) => {
                const base = it.itemType === "raw" ? unitById(data.rawMaterials.find((r) => r.id === it.refId)?.baseUnitId) : null;
                const unitLabel = it.itemType === "raw" ? base?.symbol : "unit";
                const diffColor = it.diff === 0 ? COLORS.muted : it.diff < 0 ? COLORS.alert : COLORS.success;
                return (
                  <div key={idx} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: COLORS.muted }}>{it.name} {it.itemType === "finished" && <span style={{ fontSize: 10, color: COLORS.orange }}>(Barang Jadi)</span>}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>
                      sistem {it.systemQty} → fisik {it.actualQty} {unitLabel} (<span style={{ color: diffColor }}>{it.diff > 0 ? "+" : ""}{it.diff}</span>)
                    </span>
                  </div>
                );
              })}
            </div>
            {o.status === "pending" && canApp && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={btnPrimary} onClick={() => decide(o, true)}><Check size={15} />Setujui</button>
                <button style={{ ...btnGhost, color: COLORS.alert, borderColor: COLORS.alert }} onClick={() => decide(o, false)}><XCircle size={15} />Tolak</button>
              </div>
            )}
          </div>
        ))}
        {data.opnames.length === 0 && <EmptyState text="Belum ada pengajuan stock opname." />}
      </div>
    </div>
  );
}

function PosPanel({ data, setData, role, logAction, showToast }) {
  const [cart, setCart] = useState({}); // recipeId -> qty
  const [customerName, setCustomerName] = useState("");

  const available = data.recipes.filter((r) => (r.finishedStock || 0) > 0 || (cart[r.id] || 0) > 0);
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);

  function setQty(r, qty) {
    const clamped = Math.max(0, Math.min(qty, r.finishedStock || 0));
    if (qty > (r.finishedStock || 0)) showToast("Stok produk jadi tidak cukup, jumlah disesuaikan ke stok tersedia", true);
    if (clamped === 0) {
      const { [r.id]: _, ...rest } = cart;
      setCart(rest);
    } else {
      setCart({ ...cart, [r.id]: clamped });
    }
  }
  function addToCart(r) {
    setQty(r, (cart[r.id] || 0) + 1);
  }
  function removeFromCart(r) {
    setQty(r, (cart[r.id] || 0) - 1);
  }

  function recordOrder() {
    if (cartItems.length === 0) return showToast("Belum ada produk yang dipilih", true);
    const items = cartItems.map(([rid, q]) => {
      const r = data.recipes.find((x) => x.id === rid);
      return { recipeId: rid, name: r.name, qty: q };
    });
    const updatedRecipes = data.recipes.map((r) => {
      const bought = cart[r.id];
      return bought ? { ...r, finishedStock: (r.finishedStock || 0) - bought } : r;
    });
    const order = {
      id: uid("order"),
      orderNumber: "ORD-" + Date.now().toString().slice(-8),
      customerName: customerName.trim() || null,
      items,
      status: "masuk",
      recordedBy: role,
      createdAt: new Date().toISOString(),
    };
    setData({
      ...data,
      recipes: updatedRecipes,
      sales: [order, ...(data.sales || [])],
      auditLog: [logAction("Catat Order", `${order.orderNumber}${order.customerName ? " · " + order.customerName : ""}`), ...(data.auditLog || [])].slice(0, 200),
    });
    setCart({});
    setCustomerName("");
    showToast("Order tercatat: " + order.orderNumber);
  }

  return (
    <div>
      <SectionTitle>Input Order</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {available.map((r) => (
            <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Stok: {r.finishedStock || 0}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                <button onClick={() => removeFromCart(r)} style={{ ...btnGhost, padding: "4px 8px" }}><Minus size={13} /></button>
                <input
                  type="number"
                  value={cart[r.id] || 0}
                  onChange={(e) => setQty(r, parseInt(e.target.value, 10) || 0)}
                  style={{ ...inputStyle, width: 48, textAlign: "center", padding: "4px 4px", fontFamily: "JetBrains Mono", fontSize: 14 }}
                />
                <button onClick={() => addToCart(r)} style={{ ...btnGhost, padding: "4px 8px" }}><Plus size={13} /></button>
              </div>
            </div>
          ))}
          {available.length === 0 && <EmptyState text="Belum ada produk jadi yang tersedia. Selesaikan batch produksi dulu." />}
        </div>

        <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, position: "sticky", top: 0 }}>
          <div style={{ fontFamily: "Anton", fontWeight: 700, fontSize: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><ShoppingCart size={16} />Order</div>

          <Field label="Nama pelanggan (opsional)">
            <input style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="mis. Budi" />
          </Field>

          {cartItems.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 12 }}>Belum ada item dipilih.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, marginBottom: 12 }}>
              {cartItems.map(([rid, q]) => {
                const r = data.recipes.find((x) => x.id === rid);
                return (
                  <div key={rid} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between" }}>
                    <span>{r.name}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>x{q}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 12 }} onClick={recordOrder}><Save size={16} />Catat Order</button>
        </div>
      </div>
    </div>
  );
}

function AccessPanel({ data, setData, logAction, showToast }) {
  function toggle(roleId, moduleId) {
    const current = data.permissions[roleId] || [];
    const next = current.includes(moduleId) ? current.filter((m) => m !== moduleId) : [...current, moduleId];
    const roleLabel = ROLES.find((r) => r.id === roleId)?.label || roleId;
    const moduleLabel = MODULES.find((m) => m.id === moduleId)?.label || moduleId;
    const action = current.includes(moduleId) ? "Cabut Akses" : "Beri Akses";
    setData({
      ...data,
      permissions: { ...data.permissions, [roleId]: next },
      auditLog: [logAction(action, `${roleLabel} → ${moduleLabel}`), ...(data.auditLog || [])].slice(0, 200),
    });
  }

  const editableRoles = ROLES.filter((r) => r.id !== "super_admin");

  return (
    <div>
      <SectionTitle>Manajemen Akses per Role</SectionTitle>
      <p style={{ color: COLORS.muted, fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
        Atur menu apa saja yang boleh diakses tiap bagian. Super Admin selalu punya akses penuh dan tidak bisa dibatasi.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", color: COLORS.muted, fontFamily: "Inter", fontWeight: 500, borderBottom: `1px solid ${COLORS.border}` }}>Modul</th>
              {editableRoles.map((r) => (
                <th key={r.id} style={{ padding: "8px 10px", color: COLORS.ink, fontFamily: "Anton", fontWeight: 600, borderBottom: `1px solid ${COLORS.border}` }}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: "8px 10px", borderBottom: `1px solid ${COLORS.border}` }}>{m.label}</td>
                {editableRoles.map((r) => {
                  const checked = (data.permissions[r.id] || []).includes(m.id);
                  return (
                    <td key={r.id} style={{ padding: "8px 10px", textAlign: "center", borderBottom: `1px solid ${COLORS.border}` }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(r.id, m.id)} style={{ width: 16, height: 16, accentColor: COLORS.crimson, cursor: "pointer" }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Isi email dan password.");
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError("Login gagal: " + err.message);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email || !password) return setError("Isi email dan password.");
    if (password.length < 6) return setError("Password minimal 6 karakter.");
    if (password !== password2) return setError("Konfirmasi password tidak cocok.");
    setBusy(true);
    const { data: signupData, error: err } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) return setError("Daftar gagal: " + err.message);
    if (signupData.session) {
      // Konfirmasi email nonaktif di project ini -> langsung login, tinggal tunggu role dari Super Admin
      setInfo("Akun dibuat. Tunggu Super Admin menugaskan role untuk kamu.");
    } else {
      setInfo("Akun dibuat. Cek email kamu untuk konfirmasi, lalu login di sini. Setelah itu tunggu Super Admin menugaskan role.");
      setMode("login");
    }
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter" }}>
      <style>{FONT_IMPORT}{`* { text-transform: uppercase; }`}</style>
      <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 360, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: COLORS.crimson, transform: "rotate(45deg)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, width: "auto", marginBottom: 10 }} />
          <div style={{ fontFamily: "Anton", fontSize: 24, color: COLORS.ink, marginBottom: 2 }}>RUANG KONTROL PRODUKSI</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 18 }}>
            {mode === "login" ? "Masuk ke akun kamu" : "Daftar akun baru — akses baru aktif setelah ditugaskan role oleh Super Admin"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Email">
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" />
            </Field>
            <Field label="Password">
              <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {mode === "signup" && (
              <Field label="Konfirmasi Password">
                <input style={inputStyle} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" />
              </Field>
            )}
            {error && <div style={{ fontSize: 12, color: COLORS.alert }}>{error}</div>}
            {info && <div style={{ fontSize: 12, color: COLORS.success }}>{info}</div>}
            <button type="submit" disabled={busy} style={{ ...btnPrimary, justifyContent: "center", marginTop: 4 }}>
              {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
            {mode === "login" ? (
              <>Belum punya akun? <button type="button" onClick={() => { setMode("signup"); setError(""); setInfo(""); }} style={{ background: "none", border: "none", color: COLORS.crimson, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>Daftar di sini</button></>
            ) : (
              <>Sudah punya akun? <button type="button" onClick={() => { setMode("login"); setError(""); setInfo(""); }} style={{ background: "none", border: "none", color: COLORS.crimson, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>Masuk di sini</button></>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function PendingRoleScreen({ email, onLogout, hasProfile }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter", textAlign: "center" }}>
      <style>{FONT_IMPORT}{`* { text-transform: uppercase; }`}</style>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, maxWidth: 360 }}>
        <ShieldCheck size={32} color={COLORS.crimson} style={{ marginBottom: 10 }} />
        <div style={{ fontFamily: "Anton", fontSize: 20, color: COLORS.ink, marginBottom: 6 }}>MENUNGGU PENUGASAN ROLE</div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>{email}</div>
        <div style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.6 }}>
          {hasProfile
            ? "Akun kamu sudah terdaftar, tapi Super Admin belum menetapkan bagian/role untukmu. Hubungi Super Admin untuk diberi akses."
            : "Sedang menyiapkan akun kamu..."}
        </div>
        <button onClick={onLogout} style={{ ...btnGhost, marginTop: 16, justifyContent: "center", width: "100%" }}>Keluar</button>
      </div>
    </div>
  );
}

function UsersPanel({ showToast }) {
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase.from("profiles").select("*").order("email");
    if (error) {
      setLoadError(error.message);
      setUsers([]);
    } else {
      setUsers(data);
    }
  }

  async function updateRole(userId, newRole) {
    const { error } = await supabase.from("profiles").update({ role: newRole || null }).eq("id", userId);
    if (error) return showToast("Gagal ubah role: " + error.message, true);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole || null } : u)));
    showToast("Role diperbarui");
  }

  return (
    <div>
      <SectionTitle>Kelola Pengguna</SectionTitle>
      <p style={{ color: COLORS.muted, fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
        Akun baru dibuat lewat dashboard Supabase (Authentication → Users → Add user). Begitu orang tersebut login pertama kali, namanya akan muncul di sini dan kamu tinggal pilih role-nya.
      </p>
      {loadError && <div style={{ color: COLORS.alert, fontSize: 12, marginBottom: 10 }}>{loadError}</div>}
      {users === null ? (
        <EmptyState text="Memuat daftar pengguna..." />
      ) : users.length === 0 ? (
        <EmptyState text="Belum ada pengguna yang login." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}>{u.email}</div>
              <select value={u.role || ""} onChange={(e) => updateRole(u.id, e.target.value)} style={{ ...inputStyle, width: 160 }}>
                <option value="">- Belum ditugaskan -</option>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRupiah(n) {
  return "Rp" + Math.round(n || 0).toLocaleString("id-ID");
}

function poTotals(po) {
  const subtotal = po.items.reduce((s, it) => s + it.packCount * it.pricePerPack, 0);
  const tax = subtotal * ((po.taxPercent || 0) / 100);
  const shipping = po.shippingCost || 0;
  const grandTotal = subtotal + tax + shipping;
  return { subtotal, tax, shipping, grandTotal };
}

let cachedLogoDataUrl = null;
function loadLogoDataUrl() {
  if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
  return fetch("/logo.png")
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            cachedLogoDataUrl = reader.result;
            resolve(cachedLogoDataUrl);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

async function generatePOPdf(po, supplier, company) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const { subtotal, tax, shipping, grandTotal } = poTotals(po);

  try {
    const logoDataUrl = await loadLogoDataUrl();
    doc.addImage(logoDataUrl, "PNG", 14, 8, 24, 16);
  } catch (e) {
    // kalau gagal ambil/render logo, lanjut tanpa logo (tidak mengganggu isi dokumen)
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(company.name || "NAMA PERUSAHAAN", 42, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company.address || "-", 42, 19);
  doc.text(`${company.phone || "-"} | ${company.email || "-"}`, 42, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PURCHASE ORDER", pageWidth - 14, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`PO NO: ${po.poNumber}`, pageWidth - 14, 22, { align: "right" });
  doc.text(`TANGGAL: ${new Date(po.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth - 14, 27, { align: "right" });

  doc.setDrawColor(208, 24, 41);
  doc.setLineWidth(1);
  doc.line(14, 31, pageWidth - 14, 31);

  const colLeftX = 14;
  const colRightX = pageWidth / 2 + 6;
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PEMBELI", colLeftX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company.name || "-", colLeftX, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SUPPLIER", colRightX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const supplierLines = [
    [`ORDER TO`, supplier?.name || "-"],
    [`CONTACT`, `${supplier?.contactPerson || "-"} - ${supplier?.phone || "-"}`],
    [`SHIPPED TO`, po.shippedToAddress || "-"],
    [`REQ ETD`, `${po.reqETD ? new Date(po.reqETD).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}${po.etdNote ? " (" + po.etdNote + ")" : ""}`],
  ];
  supplierLines.forEach((line, i) => {
    doc.text(`${line[0]} : ${line[1]}`, colRightX, y + 6 + i * 5);
  });

  const rows = po.items.map((it, idx) => [
    idx + 1,
    it.name,
    it.packSize,
    it.packUnit,
    it.packCount,
    formatRupiah(it.pricePerPack),
    formatRupiah(it.packCount * it.pricePerPack),
  ]);

  autoTable(doc, {
    startY: y + 30,
    head: [["No", "Nama Produk", "Qty/Pack", "Unit", "Qty", "Harga Satuan", "Total"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [208, 24, 41] },
  });

  let ySum = doc.lastAutoTable.finalY + 8;
  const sumX = pageWidth - 14;
  doc.setFontSize(9);
  doc.text("SUB TOTAL", sumX - 60, ySum);
  doc.text(formatRupiah(subtotal), sumX, ySum, { align: "right" });
  ySum += 6;
  doc.text(`PPN (${po.taxPercent || 0}%)`, sumX - 60, ySum);
  doc.text(formatRupiah(tax), sumX, ySum, { align: "right" });
  ySum += 6;
  doc.text("SHIPPING COST", sumX - 60, ySum);
  doc.text(shipping > 0 ? formatRupiah(shipping) : "FREE", sumX, ySum, { align: "right" });
  ySum += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GRAND TOTAL", sumX - 60, ySum);
  doc.text(formatRupiah(grandTotal), sumX, ySum, { align: "right" });

  let yNotes = ySum + 14;
  if (company.terms && company.terms.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PENTING:", 14, yNotes);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    company.terms.forEach((t, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageWidth - 28);
      doc.text(lines, 14, yNotes + 6 + i * 5);
      yNotes += (lines.length - 1) * 4;
    });
    yNotes += company.terms.length * 5 + 10;
  }

  doc.setFontSize(9);
  doc.text("Dipesan oleh,", 14, yNotes + 15);
  doc.text(company.picName || "(_________________)", 14, yNotes + 30);

  doc.save(`${po.poNumber}.pdf`);
}

function generatePOExcel(po, supplier, company) {
  const { subtotal, tax, shipping, grandTotal } = poTotals(po);
  const aoa = [
    [company.name || "NAMA PERUSAHAAN"],
    [company.address || "-"],
    [`${company.phone || "-"} | ${company.email || "-"}`],
    [],
    ["PURCHASE ORDER"],
    [`PO NO: ${po.poNumber}`],
    [`TANGGAL: ${new Date(po.createdAt).toLocaleDateString("id-ID")}`],
    [],
    ["PEMBELI", "", "SUPPLIER"],
    [company.name || "-", "", "ORDER TO", supplier?.name || "-"],
    ["", "", "CONTACT", `${supplier?.contactPerson || "-"} - ${supplier?.phone || "-"}`],
    ["", "", "SHIPPED TO", po.shippedToAddress || "-"],
    ["", "", "REQ ETD", `${po.reqETD ? new Date(po.reqETD).toLocaleDateString("id-ID") : "-"}${po.etdNote ? " (" + po.etdNote + ")" : ""}`],
    [],
    ["No", "Nama Produk", "Qty/Pack", "Unit", "Qty", "Harga Satuan", "Total"],
    ...po.items.map((it, idx) => [idx + 1, it.name, it.packSize, it.packUnit, it.packCount, it.pricePerPack, it.packCount * it.pricePerPack]),
    [],
    ["", "", "", "", "", "SUB TOTAL", subtotal],
    ["", "", "", "", "", `PPN (${po.taxPercent || 0}%)`, tax],
    ["", "", "", "", "", "SHIPPING COST", shipping > 0 ? shipping : "FREE"],
    ["", "", "", "", "", "GRAND TOTAL", grandTotal],
    [],
    ["PENTING:"],
    ...(company.terms || []).map((t, i) => [`${i + 1}. ${t}`]),
    [],
    ["Dipesan oleh,"],
    [company.picName || ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PO");
  XLSX.writeFile(wb, `${po.poNumber}.xlsx`);
}

function PurchasesPanel({ data, setData, unitById, logAction, showToast }) {
  const emptyItemRow = () => ({ id: uid("poi"), rawMaterialId: data.rawMaterials[0]?.id || "", packSize: "", packCount: "", pricePerPack: "" });
  const [supplierId, setSupplierId] = useState(data.suppliers[0]?.id || "");
  const [shippedToAddress, setShippedToAddress] = useState("");
  const [reqETD, setReqETD] = useState("");
  const [etdNote, setEtdNote] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [taxPercent, setTaxPercent] = useState("11");
  const [items, setItems] = useState([emptyItemRow()]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyDraft, setCompanyDraft] = useState({
    ...(data.companyProfile || {}),
    termsText: (data.companyProfile?.terms || []).join("\n"),
  });

  function addItemRow() {
    setItems([...items, emptyItemRow()]);
  }
  function updateItem(id, patch) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItemRow(id) {
    setItems(items.filter((i) => i.id !== id));
  }

  function createPO() {
    if (!supplierId) return showToast("Pilih supplier dulu", true);
    for (const it of items) {
      if (!it.rawMaterialId || !it.packSize || !it.packCount || !it.pricePerPack) return showToast("Lengkapi semua baris item (qty/pack, qty, harga)", true);
    }
    const supplier = data.suppliers.find((s) => s.id === supplierId);
    const po = {
      id: uid("po"),
      poNumber: "PO-" + Date.now().toString().slice(-8),
      supplierId,
      shippedToAddress,
      reqETD: reqETD || null,
      etdNote,
      shippingCost: parseFloat(shippingCost) || 0,
      taxPercent: parseFloat(taxPercent) || 0,
      items: items.map((it) => {
        const rm = data.rawMaterials.find((r) => r.id === it.rawMaterialId);
        const purchaseUnit = unitById(rm.purchaseUnitId);
        return {
          rawMaterialId: it.rawMaterialId,
          name: rm.name,
          packSize: parseFloat(it.packSize),
          packUnit: purchaseUnit?.symbol,
          packCount: parseFloat(it.packCount),
          pricePerPack: parseFloat(it.pricePerPack),
        };
      }),
      status: "ordered",
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, purchases: [po, ...data.purchases], auditLog: [logAction("Buat PO", `${po.poNumber} · ${supplier?.name} · ${po.items.length} item`), ...(data.auditLog || [])].slice(0, 200) });
    setItems([emptyItemRow()]);
    setShippedToAddress(""); setReqETD(""); setEtdNote(""); setShippingCost("0");
    showToast("PO dibuat: " + po.poNumber);
  }

  function receivePO(po) {
    let updatedMaterials = data.rawMaterials;
    for (const it of po.items) {
      const rm = updatedMaterials.find((r) => r.id === it.rawMaterialId);
      if (!rm) continue;
      const purchaseUnit = unitById(rm.purchaseUnitId);
      const totalPurchaseQty = (it.packSize || 0) * (it.packCount || 0);
      const receivedBase = convertToBase(totalPurchaseQty, purchaseUnit);
      const pricePerPurchaseUnit = it.packSize ? it.pricePerPack / it.packSize : 0;
      updatedMaterials = updatedMaterials.map((r) =>
        r.id === rm.id
          ? { ...r, stock: r.stock + receivedBase, lastPrice: pricePerPurchaseUnit, priceHistory: [{ price: pricePerPurchaseUnit, date: new Date().toISOString() }, ...(r.priceHistory || [])].slice(0, 50) }
          : r
      );
    }
    const updatedPurchases = data.purchases.map((p) => (p.id === po.id ? { ...p, status: "received", receivedAt: new Date().toISOString() } : p));
    setData({
      ...data,
      rawMaterials: updatedMaterials,
      purchases: updatedPurchases,
      auditLog: [logAction("Terima Barang PO", `${po.poNumber} · ${po.items.length} item`), ...(data.auditLog || [])].slice(0, 200),
    });
    showToast("Barang diterima, stok & harga bahan baku diperbarui");
  }

  function cancelPO(id) {
    setData({ ...data, purchases: data.purchases.filter((p) => p.id !== id) });
  }

  function saveCompanyProfile() {
    const { termsText, ...rest } = companyDraft;
    const terms = termsText.split("\n").map((t) => t.trim()).filter(Boolean);
    setData({ ...data, companyProfile: { ...rest, terms } });
    setEditingCompany(false);
    showToast("Info perusahaan disimpan");
  }

  const filteredPurchases = data.purchases.filter((po) => !(fromDate || toDate) || inDateRange(po.createdAt, fromDate, toDate));

  function buildExportRows() {
    return filteredPurchases.flatMap((po) => {
      const sup = data.suppliers.find((s) => s.id === po.supplierId);
      return po.items.map((it) => ({
        "No PO": po.poNumber,
        Tanggal: new Date(po.createdAt).toLocaleDateString("id-ID"),
        Supplier: sup?.name || "-",
        "Nama Produk": it.name,
        "Qty/Pack": it.packSize,
        Unit: it.packUnit,
        Qty: it.packCount,
        "Harga Satuan": it.pricePerPack,
        Total: it.packCount * it.pricePerPack,
        Status: po.status === "received" ? "Diterima" : "Dipesan",
      }));
    });
  }

  return (
    <div>
      <SectionTitle action={<button style={btnGhost} onClick={() => setEditingCompany(!editingCompany)}><Settings size={14} />Info Perusahaan</button>}>
        Buat PO
      </SectionTitle>

      {editingCompany && (
        <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Field label="Nama Perusahaan"><input style={inputStyle} value={companyDraft.name || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, name: e.target.value })} /></Field>
            <Field label="Alamat"><input style={inputStyle} value={companyDraft.address || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, address: e.target.value })} /></Field>
            <Field label="Telepon"><input style={inputStyle} value={companyDraft.phone || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, phone: e.target.value })} /></Field>
            <Field label="Email"><input style={inputStyle} value={companyDraft.email || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, email: e.target.value })} /></Field>
            <Field label="Nama Penanggung Jawab (ttd)"><input style={inputStyle} value={companyDraft.picName || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, picName: e.target.value })} /></Field>
          </div>
          <Field label="Syarat & Ketentuan (1 baris = 1 poin)">
            <textarea style={{ ...inputStyle, width: "100%", minHeight: 90, fontFamily: "Inter" }} value={companyDraft.termsText || ""} onChange={(e) => setCompanyDraft({ ...companyDraft, termsText: e.target.value })} />
          </Field>
          <button style={{ ...btnPrimary, alignSelf: "flex-start" }} onClick={saveCompanyProfile}><Save size={14} />Simpan</button>
        </div>
      )}

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <Field label="Supplier">
            <select style={inputStyle} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Shipped To (alamat kirim)"><input style={{ ...inputStyle, width: 200 }} value={shippedToAddress} onChange={(e) => setShippedToAddress(e.target.value)} /></Field>
          <Field label="Req. ETD (tanggal)"><input type="date" style={inputStyle} value={reqETD} onChange={(e) => setReqETD(e.target.value)} /></Field>
          <Field label="Catatan ETD (opsional)"><input style={inputStyle} value={etdNote} onChange={(e) => setEtdNote(e.target.value)} placeholder="mis. Working hour 08:00-15:00" /></Field>
          <Field label="Shipping cost (0 = FREE)"><input type="number" style={{ ...inputStyle, width: 110 }} value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} /></Field>
          <Field label="PPN (%)"><input type="number" style={{ ...inputStyle, width: 80 }} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></Field>
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Item yang dipesan</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...inputStyle, flex: "1 1 160px" }} value={it.rawMaterialId} onChange={(e) => updateItem(it.id, { rawMaterialId: e.target.value })}>
                {data.rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} (per {unitById(r.purchaseUnitId)?.name})</option>)}
              </select>
              <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="Qty/Pack" value={it.packSize} onChange={(e) => updateItem(it.id, { packSize: e.target.value })} />
              <input style={{ ...inputStyle, width: 80 }} type="number" placeholder="Qty" value={it.packCount} onChange={(e) => updateItem(it.id, { packCount: e.target.value })} />
              <input style={{ ...inputStyle, width: 130 }} type="number" placeholder="Harga/pack" value={it.pricePerPack} onChange={(e) => updateItem(it.id, { pricePerPack: e.target.value })} />
              <button onClick={() => removeItemRow(it.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}><X size={16} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost} onClick={addItemRow}><Plus size={14} />Tambah item</button>
          <button style={btnPrimary} onClick={createPO}><Save size={16} />Buat PO</button>
        </div>
      </div>

      <DateFilterExport
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onExportExcel={() => exportExcel("pembelian-po", buildExportRows())}
        onExportPDF={() => exportPDF("pembelian-po", "Laporan Pembelian (PO)", buildExportRows())}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredPurchases.map((po) => {
          const sup = data.suppliers.find((s) => s.id === po.supplierId);
          const { grandTotal } = poTotals(po);
          return (
            <div key={po.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{po.poNumber}</div>
                  <div style={{ fontFamily: "Anton", fontSize: 16 }}>{sup?.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{po.items.length} item · Grand Total {formatRupiah(grandTotal)}</div>
                </div>
                <StatusBadge status={po.status === "received" ? "completed" : "planned"} />
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                {po.items.map((it, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: COLORS.muted, display: "flex", justifyContent: "space-between" }}>
                    <span>{it.name}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>{it.packCount} x {it.packSize}{it.packUnit} @ {formatRupiah(it.pricePerPack)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button style={btnGhost} onClick={() => generatePOPdf(po, sup, data.companyProfile || {})}><Download size={14} />Surat PO (PDF)</button>
                <button style={btnGhost} onClick={() => generatePOExcel(po, sup, data.companyProfile || {})}><Download size={14} />Surat PO (Excel)</button>
                {po.status === "ordered" && (
                  <>
                    <button style={btnPrimary} onClick={() => receivePO(po)}><CheckCircle2 size={15} />Tandai Diterima</button>
                    <button style={btnGhost} onClick={() => cancelPO(po.id)}><Trash2 size={14} />Batalkan</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filteredPurchases.length === 0 && <EmptyState text="Belum ada pembelian ke supplier." />}
      </div>
    </div>
  );
}

function AuditLogPanel({ data }) {
  return (
    <div>
      <SectionTitle>Log Aktivitas</SectionTitle>
      <p style={{ color: COLORS.muted, fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>
        Riwayat aksi penting (batch, opname, POS, PO, perubahan akses) — 200 aktivitas terakhir.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(data.auditLog || []).map((log) => (
          <div key={log.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontFamily: "Anton", fontSize: 13, color: COLORS.crimson }}>{log.action}</span>
              <span style={{ fontSize: 12, color: COLORS.muted, marginLeft: 8 }}>{log.detail}</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "JetBrains Mono", whiteSpace: "nowrap" }}>
              {log.actor} · {new Date(log.at).toLocaleString("id-ID")}
            </div>
          </div>
        ))}
        {(!data.auditLog || data.auditLog.length === 0) && <EmptyState text="Belum ada aktivitas tercatat." />}
      </div>
    </div>
  );
}

function PettyCashPanel({ data, setData, role, logAction, showToast }) {
  const emptyForm = { type: "keluar", amount: "", description: "", date: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(emptyForm);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function addEntry() {
    if (!form.amount || !form.description) return showToast("Lengkapi jumlah dan keterangan", true);
    const entry = {
      id: uid("kas"),
      type: form.type,
      amount: parseFloat(form.amount) || 0,
      description: form.description,
      date: form.date,
      createdBy: role,
      createdAt: new Date().toISOString(),
    };
    setData({
      ...data,
      pettyCash: [entry, ...(data.pettyCash || [])],
      auditLog: [logAction(form.type === "masuk" ? "Kas Masuk" : "Kas Keluar", `Rp${entry.amount.toLocaleString("id-ID")} · ${entry.description}`), ...(data.auditLog || [])].slice(0, 200),
    });
    setForm({ ...emptyForm, date: form.date });
    showToast("Catatan kas ditambahkan");
  }

  function removeEntry(id) {
    setData({ ...data, pettyCash: (data.pettyCash || []).filter((e) => e.id !== id) });
  }

  const filtered = (data.pettyCash || [])
    .filter((e) => !(fromDate || toDate) || inDateRange(e.date, fromDate, toDate))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalMasuk = filtered.filter((e) => e.type === "masuk").reduce((s, e) => s + e.amount, 0);
  const totalKeluar = filtered.filter((e) => e.type === "keluar").reduce((s, e) => s + e.amount, 0);
  const saldo = totalMasuk - totalKeluar;

  function buildExportRows() {
    return filtered.map((e) => ({
      Tanggal: new Date(e.date).toLocaleDateString("id-ID"),
      Jenis: e.type === "masuk" ? "Kas Masuk" : "Kas Keluar",
      Keterangan: e.description,
      Jumlah: e.amount,
      "Dicatat Oleh": e.createdBy,
    }));
  }

  return (
    <div>
      <SectionTitle>Kas Kecil</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Total Masuk</div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 600, color: COLORS.success }}>Rp{totalMasuk.toLocaleString("id-ID")}</div>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Total Keluar</div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 600, color: COLORS.alert }}>Rp{totalKeluar.toLocaleString("id-ID")}</div>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: COLORS.muted }}>Saldo</div>
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 600, color: saldo >= 0 ? COLORS.ink : COLORS.alert }}>Rp{saldo.toLocaleString("id-ID")}</div>
        </div>
      </div>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Jenis">
          <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="keluar">Kas Keluar</option>
            <option value="masuk">Kas Masuk</option>
          </select>
        </Field>
        <Field label="Tanggal"><input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Jumlah (Rp)"><input type="number" style={{ ...inputStyle, width: 130 }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Keterangan"><input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="mis. Beli plastik kemasan" /></Field>
        <button style={btnPrimary} onClick={addEntry}><Plus size={16} />Tambah</button>
      </div>

      <DateFilterExport
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onExportExcel={() => exportExcel("kas-kecil", buildExportRows())}
        onExportPDF={() => exportPDF("kas-kecil", "Laporan Kas Kecil", buildExportRows())}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((e) => (
          <div key={e.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {e.type === "masuk" ? <ArrowDownCircle size={18} color={COLORS.success} /> : <ArrowUpCircle size={18} color={COLORS.alert} />}
              <div>
                <div style={{ fontSize: 13 }}>{e.description}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{new Date(e.date).toLocaleDateString("id-ID")} · {e.createdBy}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 14, color: e.type === "masuk" ? COLORS.success : COLORS.alert }}>
                {e.type === "masuk" ? "+" : "-"}Rp{e.amount.toLocaleString("id-ID")}
              </span>
              <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState text="Belum ada catatan kas kecil." />}
      </div>
    </div>
  );
}

function OrderListPanel({ data, setData, role, logAction, showToast }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const orders = (data.sales || []).map((o) => ({ ...o, status: o.status || "masuk" }));

  const counts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s.id] = orders.filter((o) => o.status === s.id).length;
    return acc;
  }, {});

  const filtered = orders
    .filter((o) => statusFilter === "all" || o.status === statusFilter)
    .filter((o) => !(fromDate || toDate) || inDateRange(o.createdAt, fromDate, toDate))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function advance(order) {
    const next = nextOrderStatus(order.status);
    if (!next) return;
    const updated = data.sales.map((o) => (o.id === order.id ? { ...o, status: next } : o));
    const nextLabel = ORDER_STATUSES.find((s) => s.id === next)?.label;
    setData({
      ...data,
      sales: updated,
      auditLog: [logAction("Update Status Order", `${order.orderNumber} → ${nextLabel}`), ...(data.auditLog || [])].slice(0, 200),
    });
    showToast(`Order ${order.orderNumber} → ${nextLabel}`);
  }

  function buildExportRows() {
    return filtered.map((o) => ({
      "No Order": o.orderNumber,
      Tanggal: new Date(o.createdAt).toLocaleDateString("id-ID"),
      Pelanggan: o.customerName || "-",
      Produk: o.items.map((it) => `${it.name} x${it.qty}`).join(", "),
      Status: ORDER_STATUSES.find((s) => s.id === o.status)?.label || o.status,
      "Dicatat Oleh": o.recordedBy,
    }));
  }

  return (
    <div>
      <SectionTitle>List Order</SectionTitle>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setStatusFilter("all")} style={{ ...btnGhost, ...(statusFilter === "all" ? { borderColor: COLORS.crimson, color: COLORS.crimson } : {}) }}>Semua ({orders.length})</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ ...btnGhost, ...(statusFilter === s.id ? { borderColor: COLORS.crimson, color: COLORS.crimson } : {}) }}>
            {s.label} ({counts[s.id] || 0})
          </button>
        ))}
      </div>

      <DateFilterExport
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        onExportExcel={() => exportExcel("list-order", buildExportRows())}
        onExportPDF={() => exportPDF("list-order", "Laporan Sales Order", buildExportRows())}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((o) => {
          const next = nextOrderStatus(o.status);
          return (
            <div key={o.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{o.orderNumber}</div>
                  <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15 }}>{o.customerName || "(tanpa nama pelanggan)"}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{new Date(o.createdAt).toLocaleDateString("id-ID")}</div>
                </div>
                <StatusBadge status={o.status === "terkirim" ? "completed" : "pending"} />
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                {o.items.map((it, idx) => (
                  <div key={idx} style={{ fontSize: 12.5, color: COLORS.muted, display: "flex", justifyContent: "space-between" }}>
                    <span>{it.name}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>x{it.qty}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.crimson, fontWeight: 600 }}>{ORDER_STATUSES.find((s) => s.id === o.status)?.label}</span>
                {next && (
                  <button style={btnPrimary} onClick={() => advance(o)}>
                    <CheckCircle2 size={14} />Lanjut ke {ORDER_STATUSES.find((s) => s.id === next)?.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState text="Belum ada order." />}
      </div>
    </div>
  );
}

function FinishedGoodsPanel({ data, setData, logAction, showToast }) {
  const [adjusting, setAdjusting] = useState(null);
  const [newQty, setNewQty] = useState("");

  function startAdjust(r) {
    setAdjusting(r.id);
    setNewQty(String(r.finishedStock || 0));
  }
  function saveAdjust(r) {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) return showToast("Jumlah tidak valid", true);
    const updated = data.recipes.map((x) => (x.id === r.id ? { ...x, finishedStock: qty } : x));
    setData({
      ...data,
      recipes: updated,
      auditLog: [logAction("Koreksi Stok Barang Jadi", `${r.name}: ${r.finishedStock || 0} → ${qty}`), ...(data.auditLog || [])].slice(0, 200),
    });
    setAdjusting(null);
    showToast("Stok barang jadi diperbarui");
  }

  return (
    <div>
      <SectionTitle>Barang Jadi</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.recipes.map((r) => (
          <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>Min. stok: {r.minFinishedStock || 0} unit</div>
            </div>
            {adjusting === r.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" style={{ ...inputStyle, width: 90 }} value={newQty} onChange={(e) => setNewQty(e.target.value)} />
                <button style={btnPrimary} onClick={() => saveAdjust(r)}><Save size={14} />Simpan</button>
                <button style={btnGhost} onClick={() => setAdjusting(null)}><X size={14} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 16, color: (r.minFinishedStock || 0) > 0 && (r.finishedStock || 0) <= r.minFinishedStock ? COLORS.alert : COLORS.ink }}>{r.finishedStock || 0} unit</span>
                <button style={btnGhost} onClick={() => startAdjust(r)}>Koreksi</button>
              </div>
            )}
          </div>
        ))}
        {data.recipes.length === 0 && <EmptyState text="Belum ada produk (buat resep dulu di menu Produksi)." />}
      </div>
    </div>
  );
}

function ProfilePanel({ session, showToast }) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    setError("");
    if (!password || password.length < 6) return setError("Password baru minimal 6 karakter.");
    if (password !== password2) return setError("Konfirmasi password tidak cocok.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError("Gagal ubah password: " + err.message);
    setPassword("");
    setPassword2("");
    showToast("Password berhasil diubah");
  }

  return (
    <div>
      <SectionTitle>Profil Saya</SectionTitle>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16, maxWidth: 420 }}>
        <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>Email</div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 14 }}>{session?.user?.email}</div>
      </div>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, maxWidth: 420 }}>
        <div style={{ fontFamily: "Anton", fontSize: 16, marginBottom: 10 }}>Ubah Password</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Password Baru">
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
          </Field>
          <Field label="Konfirmasi Password Baru">
            <input style={inputStyle} type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Ulangi password baru" />
          </Field>
          {error && <div style={{ fontSize: 12, color: COLORS.alert }}>{error}</div>}
          <button style={{ ...btnPrimary, alignSelf: "flex-start" }} disabled={busy} onClick={changePassword}>
            <Save size={15} />{busy ? "Memproses..." : "Simpan Password Baru"}
          </button>
        </div>
      </div>
    </div>
  );
}
