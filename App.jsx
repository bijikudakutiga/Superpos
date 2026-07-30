import React, { useState, useEffect, useRef } from "react";
import { Package, Beaker, Truck, ChefHat, Gauge, Plus, Trash2, X, Save, AlertTriangle, CheckCircle2, RotateCcw, Factory, ClipboardList, ShieldCheck, Check, XCircle, ShoppingCart, Settings, Minus } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');`;

const COLORS = {
  bg: "#FFF7F7",
  panel: "#FFFFFF",
  panelLight: "#FFF1F1",
  crimson: "#D01829",
  crimsonDim: "#8C0F1C",
  ink: "#20181A",
  muted: "#8A7B7D",
  alert: "#E8492F",
  success: "#1F8A4C",
  border: "#F0DCDD",
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
  { id: "sales", label: "Sales" },
];
function canApprove(role) { return role === "manager" || role === "super_admin"; }
function canInputOpname(role) { return role === "warehouse" || role === "produksi" || role === "super_admin"; }
function canManageBatch(role) { return role === "produksi" || role === "super_admin"; }

const MODULES = [
  { id: "dashboard", label: "Dasbor" },
  { id: "units", label: "Satuan" },
  { id: "materials", label: "Bahan Baku" },
  { id: "suppliers", label: "Supplier" },
  { id: "purchases", label: "Pembelian (PO)" },
  { id: "recipes", label: "Resep & Forecast" },
  { id: "batches", label: "Produksi (Batch)" },
  { id: "opname", label: "Stock Opname" },
  { id: "pos", label: "POS Penjualan" },
  { id: "audit", label: "Log Aktivitas" },
];

const DEFAULT_PERMISSIONS = {
  manager: ["dashboard", "materials", "suppliers", "purchases", "recipes", "batches", "opname", "audit"],
  warehouse: ["dashboard", "materials", "suppliers", "purchases", "opname"],
  produksi: ["dashboard", "materials", "recipes", "batches", "opname"],
  sales: ["dashboard", "pos"],
};

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
      sellPrice: 8000,
      finishedStock: 0,
      items: [
        { id: uid("ri"), rawMaterialId: rawMaterials[0].id, qty: 200, unitId: "gram" },
        { id: uid("ri"), rawMaterialId: rawMaterials[1].id, qty: 50, unitId: "gram" },
        { id: uid("ri"), rawMaterialId: rawMaterials[2].id, qty: 300, unitId: "ml" },
      ],
    },
  ];
  return { units: SEED_UNITS, suppliers, rawMaterials, recipes, batches: [], opnames: [], sales: [], purchases: [], auditLog: [], permissions: DEFAULT_PERMISSIONS };
}

function convertToBase(qty, unit) {
  return qty * unit.toBase;
}

function Gauge({ pct, danger }) {
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
  background: COLORS.crimson,
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
  const saveTimer = useRef(null);

  function normalize(parsed) {
    return {
      sales: [],
      purchases: [],
      auditLog: [],
      permissions: DEFAULT_PERMISSIONS,
      ...parsed,
      recipes: (parsed.recipes || []).map((r) => ({ sellPrice: 0, finishedStock: 0, ...r })),
      rawMaterials: (parsed.rawMaterials || []).map((r) => ({ lastPrice: 0, priceHistory: [], ...r })),
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
        showToast("Gagal konek ke Supabase, pakai data lokal sementara", true);
        const raw = localStorage.getItem("possystem:data");
        setData(normalize(raw ? JSON.parse(raw) : seedData()));
      }
      setLoading(false);
    })();
  }, [authChecked, session]);

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

  if (!data) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted, fontFamily: "Inter" }}>
        Memuat data...
      </div>
    );
  }

  const ALL_NAV = [
    { id: "dashboard", label: "Dasbor", icon: Gauge },
    { id: "units", label: "Satuan", icon: Beaker },
    { id: "materials", label: "Bahan Baku", icon: Package },
    { id: "suppliers", label: "Supplier", icon: Truck },
    { id: "purchases", label: "Pembelian (PO)", icon: ClipboardList },
    { id: "recipes", label: "Resep & Forecast", icon: ChefHat },
    { id: "batches", label: "Produksi (Batch)", icon: Factory },
    { id: "opname", label: "Stock Opname", icon: ClipboardList },
    { id: "pos", label: "POS Penjualan", icon: ShoppingCart },
    { id: "audit", label: "Log Aktivitas", icon: ShieldCheck },
  ];
  const isSuperAdmin = role === "super_admin";
  const allowedModules = isSuperAdmin ? MODULES.map((m) => m.id) : (data.permissions[role] || []);
  const NAV = ALL_NAV.filter((n) => allowedModules.includes(n.id));
  if (isSuperAdmin) NAV.push({ id: "access", label: "Manajemen Akses", icon: Settings });
  if (isSuperAdmin && supabase) NAV.push({ id: "users", label: "Kelola Pengguna", icon: ShieldCheck });

  return (
    <div style={{ background: COLORS.bg, minHeight: 640, fontFamily: "Inter", color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <style>{FONT_IMPORT}{`
        @keyframes pulseGauge { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
        * { box-sizing: border-box; }
      `}</style>

      <header style={{ position: "relative", padding: "22px 20px 20px", overflow: "hidden", borderBottom: `3px solid ${COLORS.ink}` }}>
        <div style={{ position: "absolute", top: "-20%", left: "-8%", width: "72%", height: "140%", background: COLORS.crimson, transform: "skewX(-10deg)", boxShadow: "6px 0 0 rgba(0,0,0,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "Anton", fontSize: 26, letterSpacing: 1, color: "#FFFFFF", textShadow: "2px 2px 0 rgba(0,0,0,0.25)" }}>
              RUANG KONTROL PRODUKSI
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 3, fontWeight: 600 }}>Master Data · Stok · Resep · Batch · Opname</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: dbConnected ? COLORS.success : COLORS.muted, background: "#FFFFFF", padding: "5px 9px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              {dbConnected ? "● Supabase Tersambung" : "○ Mode Lokal (belum konek DB)"}
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
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
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

      <main style={{ padding: 18, flex: 1 }}>
        {tab === "dashboard" && <Dashboard data={data} unitById={unitById} role={role} />}
        {tab === "units" && <UnitsPanel data={data} setData={setData} showToast={showToast} />}
        {tab === "materials" && <MaterialsPanel data={data} setData={setData} unitById={unitById} showToast={showToast} />}
        {tab === "suppliers" && <SuppliersPanel data={data} setData={setData} showToast={showToast} />}
        {tab === "purchases" && <PurchasesPanel data={data} setData={setData} unitById={unitById} logAction={logAction} showToast={showToast} />}
        {tab === "recipes" && <RecipesPanel data={data} setData={setData} unitById={unitById} rmById={rmById} showToast={showToast} />}
        {tab === "batches" && <BatchesPanel data={data} setData={setData} unitById={unitById} rmById={rmById} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "opname" && <OpnamePanel data={data} setData={setData} unitById={unitById} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "pos" && <PosPanel data={data} setData={setData} role={role} logAction={logAction} showToast={showToast} />}
        {tab === "access" && <AccessPanel data={data} setData={setData} logAction={logAction} showToast={showToast} />}
        {tab === "users" && <UsersPanel showToast={showToast} />}
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
  const showAnalytics = role === "super_admin" || role === "manager";

  const salesByDay = {};
  (data.sales || []).forEach((s) => {
    const day = s.createdAt.slice(0, 10);
    salesByDay[day] = (salesByDay[day] || 0) + s.total;
  });
  const salesChartData = Object.entries(salesByDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, total]) => ({ day: day.slice(5), total }));

  const bestSellerMap = {};
  (data.sales || []).forEach((s) => s.items.forEach((it) => { bestSellerMap[it.name] = (bestSellerMap[it.name] || 0) + it.qty; }));
  const bestSellerData = Object.entries(bestSellerMap).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, qty]) => ({ name, qty }));

  return (
    <div>
      {showAnalytics && (
        <>
          <SectionTitle>Grafik Penjualan</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Omzet per Hari</div>
              {salesChartData.length === 0 ? <EmptyState text="Belum ada transaksi penjualan." /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={salesChartData}>
                    <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fill: COLORS.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} width={50} />
                    <Tooltip contentStyle={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }} />
                    <Line type="monotone" dataKey="total" stroke={COLORS.crimson} strokeWidth={2} dot={{ fill: COLORS.crimson, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Produk Terlaris (qty)</div>
              {bestSellerData.length === 0 ? <EmptyState text="Belum ada transaksi penjualan." /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bestSellerData}>
                    <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} width={30} />
                    <Tooltip contentStyle={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }} />
                    <Bar dataKey="qty" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
      <SectionTitle>Status Stok Bahan Baku</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
        {data.rawMaterials.map((rm) => {
          const base = unitById(rm.baseUnitId);
          const pct = rm.minAlert > 0 ? (rm.stock / (rm.minAlert * 3)) * 100 : 100;
          const danger = rm.stock <= rm.minAlert;
          return (
            <div key={rm.id} style={{ background: COLORS.panel, border: `1px solid ${danger ? COLORS.alert : COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <Gauge pct={pct} danger={danger} />
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

  return (
    <div>
      <SectionTitle>Bahan Baku</SectionTitle>
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
  const [form, setForm] = useState({ name: "", phone: "" });

  function add() {
    if (!form.name) return showToast("Nama supplier wajib diisi", true);
    setData({ ...data, suppliers: [...data.suppliers, { id: uid("sup"), name: form.name, phone: form.phone }] });
    setForm({ name: "", phone: "" });
    showToast("Supplier ditambahkan");
  }
  function remove(id) {
    const used = data.rawMaterials.some((r) => r.supplierId === id);
    if (used) return showToast("Supplier dipakai bahan baku, tidak bisa dihapus", true);
    setData({ ...data, suppliers: data.suppliers.filter((s) => s.id !== id) });
  }

  return (
    <div>
      <SectionTitle>Database Supplier</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {data.suppliers.map((s) => (
          <div key={s.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>{s.phone || "-"}</div>
            </div>
            <button onClick={() => remove(s.id)} style={btnGhost}><Trash2 size={14} />Hapus</button>
          </div>
        ))}
        {data.suppliers.length === 0 && <EmptyState text="Belum ada supplier." />}
      </div>
      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Nama supplier"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Telepon"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <button style={btnPrimary} onClick={add}><Plus size={16} />Tambah</button>
      </div>
    </div>
  );
}

function RecipesPanel({ data, setData, unitById, rmById, showToast }) {
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("");
  const [sellPrice, setSellPrice] = useState("");
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
    const recipe = { id: uid("rcp"), name, yieldQty: parseFloat(yieldQty), sellPrice: parseFloat(sellPrice) || 0, finishedStock: 0, items: items.map((i) => ({ ...i, qty: parseFloat(i.qty) })) };
    setData({ ...data, recipes: [...data.recipes, recipe] });
    setName(""); setYieldQty(""); setSellPrice("");
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

  return (
    <div>
      <SectionTitle>Resep &amp; Forecast Produksi</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {data.recipes.map((r) => {
          const fc = forecastFor(r);
          const lastBatch = (data.batches || []).filter((b) => b.recipeId === r.id && b.status === "completed" && b.hppPerUnit != null).sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))[0];
          const margin = lastBatch ? (r.sellPrice || 0) - lastBatch.hppPerUnit : null;
          return (
            <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "Anton", fontWeight: 700, fontSize: 18 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>1 batch resep = {r.yieldQty} unit · Rp{(r.sellPrice || 0).toLocaleString("id-ID")}/unit · Stok jadi: {r.finishedStock || 0}</div>
                  {lastBatch && (
                    <div style={{ fontSize: 11.5, color: margin >= 0 ? COLORS.success : COLORS.alert, marginTop: 3, fontFamily: "JetBrains Mono" }}>
                      HPP terakhir Rp{Math.round(lastBatch.hppPerUnit).toLocaleString("id-ID")}/unit · Margin Rp{Math.round(margin).toLocaleString("id-ID")}/unit
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 22, color: COLORS.crimson, fontWeight: 600 }}>{fc}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>unit bisa diproduksi sekarang</div>
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
          <Field label="Harga jual per unit (Rp)"><input style={{ ...inputStyle, width: 120 }} type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="8000" /></Field>
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

function BatchesPanel({ data, setData, unitById, rmById, role, logAction, showToast }) {
  const allowed = canManageBatch(role);
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id || "");
  const [multiplier, setMultiplier] = useState("1");
  const [finishing, setFinishing] = useState(null); // batch id being finished
  const [actualOutput, setActualOutput] = useState("");
  const [rejectQty, setRejectQty] = useState("0");

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
      plannedOutput: mult * recipe.yieldQty,
      actualOutput: null,
      rejectQty: 0,
      status: "planned",
      items,
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, batches: [batch, ...data.batches] });
    setMultiplier("1");
    showToast("Batch dibuat: " + batch.batchNumber);
  }

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
      <SectionTitle>Produksi per Batch</SectionTitle>
      {!allowed && <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>Login sebagai Produksi atau Super Admin untuk membuat/menyelesaikan batch.</div>}

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Resep">
          <select style={inputStyle} value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            {data.recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Jumlah batch (kelipatan resep)"><input style={{ ...inputStyle, width: 100 }} type="number" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></Field>
        {recipe && <div style={{ fontSize: 12, color: COLORS.muted }}>Output rencana: <b style={{ color: COLORS.ink }}>{(parseFloat(multiplier) || 0) * recipe.yieldQty}</b> unit</div>}
        <button style={btnPrimary} onClick={createBatch} disabled={!allowed}><Plus size={16} />Buat Batch</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.batches.map((b) => (
          <div key={b.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{b.batchNumber}</div>
                <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16 }}>{b.recipeName} · x{b.multiplier}</div>
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
        {data.batches.length === 0 && <EmptyState text="Belum ada batch produksi." />}
      </div>
    </div>
  );
}

function OpnamePanel({ data, setData, unitById, role, logAction, showToast }) {
  const canInput = canInputOpname(role);
  const canApp = canApprove(role);
  const [draft, setDraft] = useState({});

  function submitOpname() {
    if (!canInput) return showToast("Hanya Warehouse/Produksi/Super Admin yang bisa input opname", true);
    const entries = Object.entries(draft).filter(([, v]) => v !== "" && v !== undefined);
    if (entries.length === 0) return showToast("Isi minimal satu jumlah fisik bahan baku", true);
    const items = entries.map(([rmId, val]) => {
      const rm = data.rawMaterials.find((r) => r.id === rmId);
      return { rawMaterialId: rmId, systemQty: rm.stock, actualQty: parseFloat(val), diff: parseFloat(val) - rm.stock };
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
        const it = opname.items.find((i) => i.rawMaterialId === rm.id);
        return it ? { ...rm, stock: it.actualQty } : rm;
      });
      const updatedOpnames = data.opnames.map((o) => (o.id === opname.id ? { ...o, status: "approved", approvedBy: role, approvedAt: new Date().toISOString() } : o));
      setData({
        ...data,
        rawMaterials: updatedMaterials,
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
          <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Input Hitung Fisik</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.rawMaterials.map((rm) => {
              const base = unitById(rm.baseUnitId);
              return (
                <div key={rm.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13 }}>{rm.name} <span style={{ color: COLORS.muted, fontSize: 11 }}>(sistem: {rm.stock.toLocaleString("id-ID")} {base?.symbol})</span></div>
                  <input style={{ ...inputStyle, width: 120 }} type="number" placeholder={`Jumlah fisik (${base?.symbol})`} value={draft[rm.id] ?? ""} onChange={(e) => setDraft({ ...draft, [rm.id]: e.target.value })} />
                </div>
              );
            })}
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
                const rm = data.rawMaterials.find((r) => r.id === it.rawMaterialId);
                const base = unitById(rm?.baseUnitId);
                const diffColor = it.diff === 0 ? COLORS.muted : it.diff < 0 ? COLORS.alert : COLORS.success;
                return (
                  <div key={idx} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: COLORS.muted }}>{rm?.name}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>
                      sistem {it.systemQty} → fisik {it.actualQty} {base?.symbol} (<span style={{ color: diffColor }}>{it.diff > 0 ? "+" : ""}{it.diff}</span>)
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

  const sellable = data.recipes.filter((r) => (r.finishedStock || 0) > 0 || (cart[r.id] || 0) > 0);
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const total = cartItems.reduce((sum, [rid, q]) => {
    const r = data.recipes.find((x) => x.id === rid);
    return sum + (r?.sellPrice || 0) * q;
  }, 0);

  function addToCart(r) {
    const current = cart[r.id] || 0;
    if (current + 1 > (r.finishedStock || 0)) return showToast("Stok produk jadi tidak cukup", true);
    setCart({ ...cart, [r.id]: current + 1 });
  }
  function removeFromCart(r) {
    const current = cart[r.id] || 0;
    if (current <= 1) {
      const { [r.id]: _, ...rest } = cart;
      setCart(rest);
    } else {
      setCart({ ...cart, [r.id]: current - 1 });
    }
  }

  function checkout() {
    if (cartItems.length === 0) return showToast("Keranjang masih kosong", true);
    const items = cartItems.map(([rid, q]) => {
      const r = data.recipes.find((x) => x.id === rid);
      return { recipeId: rid, name: r.name, qty: q, price: r.sellPrice, subtotal: r.sellPrice * q };
    });
    const updatedRecipes = data.recipes.map((r) => {
      const bought = cart[r.id];
      return bought ? { ...r, finishedStock: (r.finishedStock || 0) - bought } : r;
    });
    const sale = { id: uid("sale"), transactionNumber: "TRX-" + Date.now().toString().slice(-8), items, total, cashier: role, createdAt: new Date().toISOString() };
    setData({ ...data, recipes: updatedRecipes, sales: [sale, ...(data.sales || [])], auditLog: [logAction("Transaksi POS", `${sale.transactionNumber} · Rp${total.toLocaleString("id-ID")}`), ...(data.auditLog || [])].slice(0, 200) });
    setCart({});
    showToast("Transaksi berhasil: Rp" + total.toLocaleString("id-ID"));
  }

  return (
    <div>
      <SectionTitle>POS Penjualan</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {sellable.map((r) => (
            <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontFamily: "Anton", fontWeight: 600, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 14, color: COLORS.crimson, marginTop: 4 }}>Rp{(r.sellPrice || 0).toLocaleString("id-ID")}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>Stok: {r.finishedStock || 0}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button onClick={() => removeFromCart(r)} style={{ ...btnGhost, padding: "4px 8px" }}><Minus size={13} /></button>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 14, minWidth: 18, textAlign: "center" }}>{cart[r.id] || 0}</span>
                <button onClick={() => addToCart(r)} style={{ ...btnGhost, padding: "4px 8px" }}><Plus size={13} /></button>
              </div>
            </div>
          ))}
          {sellable.length === 0 && <EmptyState text="Belum ada produk jadi yang siap dijual. Selesaikan batch produksi dulu." />}
        </div>

        <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, position: "sticky", top: 0 }}>
          <div style={{ fontFamily: "Anton", fontWeight: 700, fontSize: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><ShoppingCart size={16} />Keranjang</div>
          {cartItems.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.muted }}>Belum ada item.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {cartItems.map(([rid, q]) => {
                const r = data.recipes.find((x) => x.id === rid);
                return (
                  <div key={rid} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between" }}>
                    <span>{r.name} x{q}</span>
                    <span style={{ fontFamily: "JetBrains Mono" }}>Rp{(r.sellPrice * q).toLocaleString("id-ID")}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontFamily: "Anton", fontWeight: 700, fontSize: 17 }}>
            <span>Total</span>
            <span style={{ color: COLORS.crimson, fontFamily: "JetBrains Mono" }}>Rp{total.toLocaleString("id-ID")}</span>
          </div>
          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 12 }} onClick={checkout}><Save size={16} />Checkout</button>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  return (
    <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter" }}>
      <style>{FONT_IMPORT}</style>
      <form onSubmit={handleLogin} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 360, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, background: COLORS.crimson, transform: "rotate(45deg)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "Anton", fontSize: 24, color: COLORS.ink, marginBottom: 2 }}>RUANG KONTROL PRODUKSI</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 18 }}>Masuk dengan akun yang sudah dibuatkan Super Admin</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Email">
              <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" />
            </Field>
            <Field label="Password">
              <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {error && <div style={{ fontSize: 12, color: COLORS.alert }}>{error}</div>}
            <button type="submit" disabled={busy} style={{ ...btnPrimary, justifyContent: "center", marginTop: 4 }}>
              {busy ? "Memproses..." : "Masuk"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 16, lineHeight: 1.5 }}>
            Belum punya akun? Minta Super Admin membuatkan lewat dashboard Supabase (Authentication → Users → Add user), lalu login di sini.
          </div>
        </div>
      </form>
    </div>
  );
}

function PendingRoleScreen({ email, onLogout, hasProfile }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter", textAlign: "center" }}>
      <style>{FONT_IMPORT}</style>
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

function PurchasesPanel({ data, setData, unitById, logAction, showToast }) {
  const emptyForm = { supplierId: data.suppliers[0]?.id || "", rawMaterialId: data.rawMaterials[0]?.id || "", qty: "", price: "" };
  const [form, setForm] = useState(emptyForm);

  function createPO() {
    if (!form.supplierId || !form.rawMaterialId || !form.qty || !form.price) return showToast("Lengkapi semua field pembelian", true);
    const rm = data.rawMaterials.find((r) => r.id === form.rawMaterialId);
    const purchaseUnit = unitById(rm.purchaseUnitId);
    const po = {
      id: uid("po"),
      poNumber: "PO-" + Date.now().toString().slice(-8),
      supplierId: form.supplierId,
      rawMaterialId: form.rawMaterialId,
      qty: parseFloat(form.qty), // dalam satuan beli, mis. kg
      unitSymbol: purchaseUnit?.symbol,
      price: parseFloat(form.price), // harga per satuan beli
      status: "ordered",
      createdAt: new Date().toISOString(),
    };
    setData({ ...data, purchases: [po, ...data.purchases], auditLog: [logAction("Buat PO", `${po.poNumber} · ${rm.name}`), ...(data.auditLog || [])].slice(0, 200) });
    setForm(emptyForm);
    showToast("PO dibuat: " + po.poNumber);
  }

  function receivePO(po) {
    const rm = data.rawMaterials.find((r) => r.id === po.rawMaterialId);
    const purchaseUnit = unitById(rm.purchaseUnitId);
    const receivedBase = convertToBase(po.qty, purchaseUnit);
    const updatedMaterials = data.rawMaterials.map((r) =>
      r.id === rm.id
        ? { ...r, stock: r.stock + receivedBase, lastPrice: po.price, priceHistory: [{ price: po.price, date: new Date().toISOString() }, ...(r.priceHistory || [])].slice(0, 50) }
        : r
    );
    const updatedPurchases = data.purchases.map((p) => (p.id === po.id ? { ...p, status: "received", receivedAt: new Date().toISOString() } : p));
    setData({
      ...data,
      rawMaterials: updatedMaterials,
      purchases: updatedPurchases,
      auditLog: [logAction("Terima Barang PO", `${po.poNumber} · ${rm.name} +${po.qty} ${purchaseUnit?.symbol}`), ...(data.auditLog || [])].slice(0, 200),
    });
    showToast("Barang diterima, stok & harga bahan baku diperbarui");
  }

  function cancelPO(id) {
    setData({ ...data, purchases: data.purchases.filter((p) => p.id !== id) });
  }

  return (
    <div>
      <SectionTitle>Pembelian ke Supplier (PO)</SectionTitle>

      <div style={{ background: COLORS.panelLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <Field label="Supplier">
          <select style={inputStyle} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Bahan baku">
          <select style={inputStyle} value={form.rawMaterialId} onChange={(e) => setForm({ ...form, rawMaterialId: e.target.value })}>
            {data.rawMaterials.map((rm) => <option key={rm.id} value={rm.id}>{rm.name} (beli per {unitById(rm.purchaseUnitId)?.name})</option>)}
          </select>
        </Field>
        <Field label="Jumlah (satuan beli)"><input style={{ ...inputStyle, width: 100 }} type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
        <Field label="Harga per satuan beli (Rp)"><input style={{ ...inputStyle, width: 130 }} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        <button style={btnPrimary} onClick={createPO}><Plus size={16} />Buat PO</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.purchases.map((po) => {
          const rm = data.rawMaterials.find((r) => r.id === po.rawMaterialId);
          const sup = data.suppliers.find((s) => s.id === po.supplierId);
          const total = po.qty * po.price;
          return (
            <div key={po.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: COLORS.crimson }}>{po.poNumber}</div>
                  <div style={{ fontFamily: "Anton", fontSize: 16 }}>{rm?.name} · {sup?.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{po.qty} {po.unitSymbol} x Rp{po.price.toLocaleString("id-ID")} = Rp{total.toLocaleString("id-ID")}</div>
                </div>
                <StatusBadge status={po.status === "received" ? "completed" : "planned"} />
              </div>
              {po.status === "ordered" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={btnPrimary} onClick={() => receivePO(po)}><CheckCircle2 size={15} />Tandai Diterima</button>
                  <button style={btnGhost} onClick={() => cancelPO(po.id)}><Trash2 size={14} />Batalkan</button>
                </div>
              )}
            </div>
          );
        })}
        {data.purchases.length === 0 && <EmptyState text="Belum ada pembelian ke supplier." />}
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
