import express from "express";
import dotenv from "dotenv";
import { pool } from "./db.js";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import YAML from "yamljs";
import { WebSocketServer } from "ws";
import http from "http";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/thermal" });

const clients = new Set();

// =========================
// WEBSOCKET
// =========================
wss.on("connection", (ws) => {
  console.log("🔌 WS cliente conectado. Total:", clients.size + 1);
  clients.add(ws);

  ws.on("message", (message, isBinary) => {
    if (isBinary) {
      // Frame térmico binario — broadcast directo sin parsear
      clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(message, { binary: true });
        }
      });
      return;
    }

    // Mensajes de texto (DHT11, etc.) — igual que antes
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "dht11") {
        clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (err) {
      console.error("WS parse error:", err.message);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("🔌 WS cliente desconectado. Total:", clients.size);
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
    clients.delete(ws);
  });
});

// =========================
// SWAGGER
// =========================
const swaggerDocument = YAML.load("./openapi.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// =========================
// TEMP BUFFER
// =========================
let tempBuffer    = [];
let lastTemperature = null;
let lastSavedTime   = Date.now();

// =========================
// TEMPERATURE
// =========================
app.post("/temperature", async (req, res) => {
  const { value } = req.body;
  lastTemperature = value;
  tempBuffer.push(value);

  const now = Date.now();
  if (now - lastSavedTime >= 600000 && tempBuffer.length > 0) {
    const avg = tempBuffer.reduce((a, b) => a + b) / tempBuffer.length;
    const min = Math.min(...tempBuffer);
    const max = Math.max(...tempBuffer);
    await pool.query(
        "INSERT INTO temperature (value_avg,value_min,value_max) VALUES ($1,$2,$3)",
        [avg, min, max]
    );
    tempBuffer    = [];
    lastSavedTime = now;
  }
  res.json({ ok: true });
});

app.get("/temperature/live", (req, res) => {
  res.json({ value: lastTemperature });
});

app.get("/temperature", async (req, res) => {
  const r = await pool.query(
      "SELECT * FROM temperature ORDER BY created_at DESC LIMIT 100"
  );
  res.json(r.rows);
});

// =========================
// DHT11
// =========================
app.post("/dht11", async (req, res) => {
  const { temperature, humidity } = req.body;
  await pool.query(
      "INSERT INTO dht11 (temperature, humidity) VALUES ($1,$2)",
      [temperature, humidity]
  );
  res.json({ ok: true });
});

app.get("/dht11/last", async (req, res) => {
  const r = await pool.query(
      "SELECT * FROM dht11 ORDER BY created_at DESC LIMIT 1"
  );
  res.json(r.rows[0] || {});
});

// =========================
// BUZZER  ✅ ENDPOINTS FALTANTES AGREGADOS
// =========================
app.get("/buzzer/status", async (req, res) => {
  const r = await pool.query("SELECT state FROM buzzer WHERE id=1");
  res.json(r.rows[0] || { state: false });
});

app.post("/buzzer/on", async (req, res) => {
  await pool.query(
      "UPDATE buzzer SET state=true, updated_at=NOW() WHERE id=1"
  );
  res.json({ ok: true });
});

app.post("/buzzer/off", async (req, res) => {
  await pool.query(
      "UPDATE buzzer SET state=false, updated_at=NOW() WHERE id=1"
  );
  res.json({ ok: true });
});

// =========================
// MONITORING
// =========================
app.get("/monitoring/status", async (req, res) => {
  const r = await pool.query(
      "SELECT active FROM monitoring_mode WHERE id=1"
  );
  res.json(r.rows[0]);
});

app.post("/monitoring/on", async (req, res) => {
  await pool.query("UPDATE monitoring_mode SET active=true WHERE id=1");
  res.json({ ok: true });
});

app.post("/monitoring/off", async (req, res) => {
  await pool.query("UPDATE monitoring_mode SET active=false WHERE id=1");
  res.json({ ok: true });
});

// =========================
// START
// =========================
server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🚀 API corriendo en puerto ${process.env.PORT}`);
});