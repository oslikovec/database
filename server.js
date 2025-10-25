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

// ====== Spuštění serveru ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server běží na portu ${PORT}`));
