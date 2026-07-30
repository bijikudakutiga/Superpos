-- =====================================================================
-- SKEMA DATABASE: SUPER APP POS + PRODUKSI (F&B)
-- Database: PostgreSQL
-- =====================================================================

-- =====================================================================
-- 1. MODUL USER, ROLE, & OTORISASI
-- =====================================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL, -- super_admin, manager, warehouse, produksi, finance, sales
    description     TEXT,
    is_system_role  BOOLEAN DEFAULT FALSE, -- true utk super_admin, tidak boleh dihapus
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Daftar modul/menu aplikasi (dipakai untuk permission granular)
CREATE TABLE modules (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL, -- 'pos', 'stok_bahan_baku', 'resep', 'produksi_batch',
                                                  -- 'stock_opname', 'forecast', 'supplier', 'finance_report', 'user_management'
    name            VARCHAR(100) NOT NULL
);

-- Permission granular: role X boleh apa saja (view/create/edit/delete/approve) di modul Y
CREATE TABLE role_permissions (
    id              SERIAL PRIMARY KEY,
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module_id       INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    can_view        BOOLEAN DEFAULT FALSE,
    can_create      BOOLEAN DEFAULT FALSE,
    can_edit        BOOLEAN DEFAULT FALSE,
    can_delete      BOOLEAN DEFAULT FALSE,
    can_approve     BOOLEAN DEFAULT FALSE, -- khusus utk acc stock opname, PO, dsb
    UNIQUE(role_id, module_id)
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(id),
    outlet_id       INT REFERENCES outlets(id), -- nullable, isi jika multi-outlet & user terikat 1 outlet
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Log audit: siapa melakukan apa (wajib untuk akuntabilitas multi-role)
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id),
    action          VARCHAR(100) NOT NULL, -- 'CREATE_RESEP', 'APPROVE_OPNAME', 'EDIT_STOK', dst
    table_name      VARCHAR(100),
    record_id       INT,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- 2. MULTI-OUTLET (opsional, siap untuk ekspansi cabang)
-- =====================================================================

CREATE TABLE outlets (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    address         TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- 3. SATUAN (UNIT OF MEASURE) & KONVERSI
-- =====================================================================

CREATE TABLE units (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL, -- 'kilogram', 'gram', 'liter', 'mililiter', 'pcs'
    symbol          VARCHAR(10) NOT NULL,        -- 'kg', 'gr', 'l', 'ml', 'pcs'
    unit_type       VARCHAR(20) NOT NULL         -- 'berat', 'volume', 'satuan'
);

-- Base unit per tipe (mis: gram = base utk 'berat', ml = base utk 'volume')
-- Semua konversi disimpan relatif terhadap base unit -> aman & konsisten, tidak perlu N x N tabel
CREATE TABLE unit_conversions (
    id              SERIAL PRIMARY KEY,
    unit_id         INT NOT NULL REFERENCES units(id),
    base_unit_id    INT NOT NULL REFERENCES units(id), -- unit dasar dlm tipe yg sama, mis: gram
    multiplier      DECIMAL(18,6) NOT NULL             -- 1 unit_id = multiplier x base_unit_id
    -- contoh: kg -> gram, multiplier = 1000 (1 kg = 1000 gram)
);

-- =====================================================================
-- 4. SUPPLIER
-- =====================================================================

CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(30),
    email           VARCHAR(150),
    address         TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- 5. BAHAN BAKU & STOK
-- =====================================================================

CREATE TABLE raw_materials (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(50) UNIQUE NOT NULL, -- SKU internal
    name                VARCHAR(150) NOT NULL,       -- 'Tepung Terigu'
    base_unit_id        INT NOT NULL REFERENCES units(id), -- satuan penyimpanan stok, mis: gram
    purchase_unit_id    INT NOT NULL REFERENCES units(id), -- satuan beli, mis: kg
    min_stock_alert     DECIMAL(18,3) DEFAULT 0,     -- dalam base_unit, utk reorder point
    default_supplier_id INT REFERENCES suppliers(id),
    is_perishable       BOOLEAN DEFAULT FALSE,        -- utk fitur expiry/FEFO
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Stok per outlet/gudang, disimpan dalam base_unit (mis: gram) supaya konsisten
CREATE TABLE raw_material_stocks (
    id              SERIAL PRIMARY KEY,
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    quantity        DECIMAL(18,3) NOT NULL DEFAULT 0, -- dalam base_unit
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(raw_material_id, outlet_id)
);

-- Batch/lot bahan baku (untuk expiry & FEFO, opsional tapi direkomendasikan)
CREATE TABLE raw_material_lots (
    id              SERIAL PRIMARY KEY,
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    lot_number      VARCHAR(50),
    quantity        DECIMAL(18,3) NOT NULL, -- dalam base_unit
    expiry_date     DATE,
    received_at     TIMESTAMP DEFAULT NOW()
);

-- History harga beli bahan baku (penting utk HPP akurat per periode)
CREATE TABLE raw_material_price_history (
    id              SERIAL PRIMARY KEY,
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    supplier_id     INT REFERENCES suppliers(id),
    price_per_unit  DECIMAL(18,2) NOT NULL, -- harga per purchase_unit
    effective_date  DATE NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Kartu stok / mutasi stok (log setiap pergerakan: masuk PO, keluar produksi, adjustment opname, dll)
CREATE TABLE stock_movements (
    id              BIGSERIAL PRIMARY KEY,
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    movement_type   VARCHAR(30) NOT NULL, -- 'PURCHASE_IN', 'PRODUCTION_OUT', 'OPNAME_ADJUSTMENT', 'WASTE'
    quantity        DECIMAL(18,3) NOT NULL, -- +/- dalam base_unit
    reference_table VARCHAR(50),  -- 'purchase_orders', 'production_batches', 'stock_opnames'
    reference_id    INT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- 6. PEMBELIAN KE SUPPLIER (PO & Penerimaan Barang)
-- =====================================================================

CREATE TABLE purchase_orders (
    id              SERIAL PRIMARY KEY,
    po_number       VARCHAR(50) UNIQUE NOT NULL,
    supplier_id     INT NOT NULL REFERENCES suppliers(id),
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    status          VARCHAR(20) DEFAULT 'draft', -- draft, ordered, received, cancelled
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    received_at     TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id                  SERIAL PRIMARY KEY,
    purchase_order_id   INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    raw_material_id     INT NOT NULL REFERENCES raw_materials(id),
    quantity            DECIMAL(18,3) NOT NULL, -- dalam purchase_unit
    price_per_unit      DECIMAL(18,2) NOT NULL,
    subtotal            DECIMAL(18,2) NOT NULL
);

-- =====================================================================
-- 7. RESEP & PRODUK JADI
-- =====================================================================

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(150) NOT NULL,   -- nama produk jadi, mis: 'Roti Coklat'
    sell_price      DECIMAL(18,2) NOT NULL,
    category        VARCHAR(100),
    image_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipes (
    id              SERIAL PRIMARY KEY,
    product_id      INT NOT NULL REFERENCES products(id),
    name            VARCHAR(150) NOT NULL, -- bisa beda versi resep utk produk yg sama
    yield_quantity  DECIMAL(18,3) NOT NULL DEFAULT 1, -- 1 resep menghasilkan berapa unit produk jadi
    version         INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Detail bahan baku per resep (harus ref ke raw_materials yg sudah ada -> sesuai requirement)
CREATE TABLE recipe_items (
    id              SERIAL PRIMARY KEY,
    recipe_id       INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    raw_material_id INT NOT NULL REFERENCES raw_materials(id),
    quantity        DECIMAL(18,3) NOT NULL, -- jumlah yg dibutuhkan
    unit_id         INT NOT NULL REFERENCES units(id), -- satuan input saat bikin resep, mis: gram
    -- saat dipakai/dihitung, quantity dikonversi ke base_unit bahan baku via unit_conversions
    notes           VARCHAR(255)
);

-- =====================================================================
-- 8. PRODUKSI PER BATCH
-- =====================================================================

CREATE TABLE production_batches (
    id                  SERIAL PRIMARY KEY,
    batch_number        VARCHAR(50) UNIQUE NOT NULL, -- mis: BATCH-20260730-001
    recipe_id           INT NOT NULL REFERENCES recipes(id),
    outlet_id           INT NOT NULL REFERENCES outlets(id),
    planned_quantity    DECIMAL(18,3) NOT NULL, -- target output (jumlah resep/kelipatan yield)
    actual_quantity     DECIMAL(18,3),          -- hasil aktual (bisa < planned krn reject)
    reject_quantity     DECIMAL(18,3) DEFAULT 0,-- jumlah gagal/waste
    status              VARCHAR(20) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    started_at          TIMESTAMP,
    finished_at         TIMESTAMP,
    produced_by         INT REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Detail pemakaian bahan baku aktual per batch (snapshot, walau resep berubah nanti data historis aman)
CREATE TABLE production_batch_items (
    id                      SERIAL PRIMARY KEY,
    production_batch_id     INT NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    raw_material_id         INT NOT NULL REFERENCES raw_materials(id),
    planned_quantity        DECIMAL(18,3) NOT NULL, -- dalam base_unit, hasil kalkulasi dari resep x planned_quantity
    actual_quantity_used    DECIMAL(18,3),          -- realisasi pemakaian (bisa beda krn susut/reject)
    unit_cost_snapshot      DECIMAL(18,2)           -- harga bahan baku saat itu, utk HPP historis
);

-- =====================================================================
-- 9. STOCK OPNAME (dgn approval manager)
-- =====================================================================

CREATE TABLE stock_opnames (
    id              SERIAL PRIMARY KEY,
    opname_number   VARCHAR(50) UNIQUE NOT NULL,
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    status          VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    input_by        INT NOT NULL REFERENCES users(id), -- warehouse/produksi
    approved_by     INT REFERENCES users(id),           -- manager
    approved_at     TIMESTAMP,
    rejection_reason TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_opname_items (
    id                  SERIAL PRIMARY KEY,
    stock_opname_id     INT NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
    raw_material_id     INT NOT NULL REFERENCES raw_materials(id),
    system_quantity     DECIMAL(18,3) NOT NULL, -- stok sistem saat opname dibuat (base_unit)
    actual_quantity     DECIMAL(18,3) NOT NULL, -- hasil hitung fisik (base_unit)
    difference          DECIMAL(18,3) GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
    notes               VARCHAR(255)
);

-- =====================================================================
-- 10. POS / PENJUALAN
-- =====================================================================

CREATE TABLE pos_transactions (
    id              SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    outlet_id       INT NOT NULL REFERENCES outlets(id),
    cashier_id      INT NOT NULL REFERENCES users(id), -- role: sales
    total_amount    DECIMAL(18,2) NOT NULL,
    payment_method  VARCHAR(30), -- cash, qris, debit, dll
    status          VARCHAR(20) DEFAULT 'completed', -- completed, void, refunded
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pos_transaction_items (
    id                  SERIAL PRIMARY KEY,
    pos_transaction_id  INT NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id          INT NOT NULL REFERENCES products(id),
    quantity            INT NOT NULL,
    price_per_unit       DECIMAL(18,2) NOT NULL,
    subtotal            DECIMAL(18,2) NOT NULL
);

-- =====================================================================
-- CATATAN IMPLEMENTASI PENTING
-- =====================================================================
-- 1. Semua stok bahan baku (raw_material_stocks, stock_movements, dsb) disimpan
--    dalam BASE UNIT (mis: gram), bukan dalam satuan beli (kg). Konversi hanya
--    terjadi di layer aplikasi saat: (a) input pembelian (kg -> gram),
--    (b) tampilan ke user (gram -> kg jika perlu), (c) hitung resep.
--    Ini mencegah bug pembulatan/selisih akibat konversi berulang.
--
-- 2. Forecast produk jadi DIHITUNG (bukan disimpan), formula per resep:
--    forecast_qty(resep) = MIN( stok_bahan_baku_i / recipe_item_qty_i )
--    untuk semua bahan baku i dalam resep tsb, lalu dikali yield_quantity.
--
-- 3. HPP per batch = SUM(actual_quantity_used x unit_cost_snapshot) / actual_quantity
--    dihitung dari production_batch_items, bukan dari resep master (agar akurat
--    sesuai harga & realisasi saat itu).
-- =====================================================================
