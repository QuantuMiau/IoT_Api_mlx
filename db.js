import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🔥 función para esperar a la DB
const connectWithRetry = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ DB conectada correctamente");
  } catch (err) {
    console.log("⏳ Esperando a la base de datos...");
    console.log(err.message);
    setTimeout(connectWithRetry, 3000);
  }
};

// Ejecutar al iniciar
connectWithRetry();