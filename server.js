import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ====== PostgreSQL připojení ======
const pool = new Pool({
  connectionString: "postgresql://postgres:KtSpuQhMmxJzsnLScblYoMQBZNRPpvbD@gondola.proxy.rlwy.net:19093/railway",
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ Connected to Railway PostgreSQL"))
  .catch(err => console.error("❌ Database connection failed:", err.message));

// ====== ROUTES ======

// Načti všechny položky ze skladu podle ID skladu
app.get("/api/items/:warehouseId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE warehouse_id = $1 ORDER BY id ASC",
      [req.params.warehouseId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Přidej položku
app.post("/api/items", async (req, res) => {
  const { name, qty, category, warehouse_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO items (name, qty, category, warehouse_id, updated) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
      [name, qty, category, warehouse_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smazání položky
app.delete("/api/items/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM items WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Úprava množství položky
app.put("/api/items/:id", async (req, res) => {
  const { qty } = req.body;
  try {
    const result = await pool.query(
      "UPDATE items SET qty = $1, updated = NOW() WHERE id = $2 RETURNING *",
      [qty, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SKLADY =====

// Získání všech skladů
app.get("/api/warehouses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM warehouses ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Přidání skladu
app.post("/api/warehouses", async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO warehouses (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smazání skladu
app.delete("/api/warehouses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM warehouses WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================================
// 🏗️ SPRÁVA SKLADŮ (přidání / mazání)
// =======================================

async function loadWarehouses() {
  try {
    const res = await fetch(`${API_BASE}/warehouses`);
    const data = await res.json();
    const select = document.getElementById("deleteWarehouseSelect");
    if (!select) return; // pokud nejsme ve správné sekci, ukonči
    select.innerHTML = "";
    data.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = w.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("❌ Chyba při načítání seznamu skladů:", err);
  }
}

async function addWarehouse(name) {
  try {
    await fetch(`${API_BASE}/warehouses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    alert("✅ Nový sklad vytvořen!");
    loadWarehouses();
  } catch (err) {
    console.error("❌ Chyba při přidání skladu:", err);
  }
}

async function deleteWarehouse(id) {
  try {
    await fetch(`${API_BASE}/warehouses/${id}`, { method: "DELETE" });
    alert("🗑️ Sklad byl odstraněn!");
    loadWarehouses();
  } catch (err) {
    console.error("❌ Chyba při mazání skladu:", err);
  }
}

const addWarehouseForm = document.getElementById("addWarehouseForm");
const deleteWarehouseForm = document.getElementById("deleteWarehouseForm");

if (addWarehouseForm) {
  addWarehouseForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("warehouseName").value.trim();
    if (name) addWarehouse(name);
    addWarehouseForm.reset();
  });
}

if (deleteWarehouseForm) {
  deleteWarehouseForm.addEventListener("submit", e => {
    e.preventDefault();
    const id = document.getElementById("deleteWarehouseSelect").value;
    if (id && confirm("Opravdu chceš smazat tento sklad?")) {
      deleteWarehouse(id);
    }
  });
}

// Načti seznam skladů po načtení celé stránky
window.addEventListener("DOMContentLoaded", loadWarehouses);


// ====== Spuštění serveru ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server běží na portu ${PORT}`));
