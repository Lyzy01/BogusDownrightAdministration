import express from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import connectPgSimple from "connect-pg-simple";
import pool, { initDb } from "./db.js";
import authRouter from "./routes/auth.js";
import botsRouter from "./routes/bots.js";
import commandsRouter from "./routes/commands.js";
import modulesRouter from "./routes/modules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PgSession = connectPgSimple(session);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "discord-bot-hosting-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRouter);
app.use("/api/bots", botsRouter);
app.use("/api/bots/:botId/commands", commandsRouter);
app.use("/api/bots/:botId/modules", modulesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/config", (_req, res) => {
  res.json({
    discordConfigured: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
  });
});

const distPath = join(__dirname, "../dist/client");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDb();
    const server = createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
