import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ====== PostgreSQL připojení ======
const pool = new Pool({
  connectionString: "postgresql://postgres:koMYKonJqJiqHqkKCTsBujrLuovgNnZy@yamabiko.proxy.rlwy.net:48234/railway",
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(async () => {
    console.log("✅ Connected to Railway PostgreSQL");

    // ✅ Oprava sekvencí pro AUTO INCREMENT
    try {
      await pool.query(`
        -- vytvoř sekvenci pokud chybí
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'warehouses_id_seq') THEN
            CREATE SEQUENCE warehouses_id_seq START 1;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'items_id_seq') THEN
            CREATE SEQUENCE items_id_seq START 1;
          END IF;
        END$$;

        -- připoj sekvence ke sloupcům
        ALTER TABLE warehouses ALTER COLUMN id SET DEFAULT nextval('warehouses_id_seq');
        ALTER TABLE items ALTER COLUMN id SET DEFAULT nextval('items_id_seq');

        -- ✅ synchronizuj sekvence s nejvyšším ID v tabulkách
        SELECT setval('warehouses_id_seq', COALESCE((SELECT MAX(id) FROM warehouses), 0) + 1, false);
        SELECT setval('items_id_seq', COALESCE((SELECT MAX(id) FROM items), 0) + 1, false);
      `);
      console.log("✅ AUTO INCREMENT sekvence opraveny a synchronizovány!");
    } catch (err) {
      console.error("❌ Chyba při opravě sekvencí:", err.message);
    }
  })
  .catch(err => console.error("❌ Database connection failed:", err.message));


// =======================================
// 📦 ITEMS API
// =======================================

// Načti všechny položky podle ID skladu
app.get("/api/items/:warehouseId", async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const result = await pool.query(
      "SELECT * FROM items WHERE warehouse_id = $1 ORDER BY id ASC",
      [warehouseId]
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error("❌ Chyba při načítání položek:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Přidej novou položku
app.post("/api/items", async (req, res) => {
  const { name, qty, category, warehouse_id } = req.body;
  if (!name || !warehouse_id) {
    return res.status(400).json({ error: "Chybí povinná data." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO items (name, qty, category, warehouse_id, updated) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [name, qty || 0, category || "", warehouse_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Chyba při přidávání položky:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Aktualizace množství položky
app.put("/api/items/:id", async (req, res) => {
  const { qty } = req.body;
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE items SET qty = $1, updated = NOW() WHERE id = $2 RETURNING *",
      [qty, id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("❌ Chyba při úpravě množství:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Smazání položky
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM items WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Chyba při mazání položky:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// 🏭 WAREHOUSES API
// =======================================

// Získání všech skladů
app.get("/api/warehouses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM warehouses ORDER BY id ASC");
    // vracíme pole i když je prázdné, aby frontend neměl undefined
    res.json(result.rows || []);
  } catch (err) {
    console.error("❌ Chyba při načítání skladů:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Přidání skladu
app.post("/api/warehouses", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Název skladu je povinný." });

  try {
    const result = await pool.query(
      "INSERT INTO warehouses (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Chyba při přidávání skladu:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Smazání skladu
app.delete("/api/warehouses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM warehouses WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Chyba při mazání skladu:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// 🚀 START SERVERU
// =======================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server běží na portu ${PORT}`));
