import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";
import { startBot, stopBot, getBotStatus, AVAILABLE_INTENTS } from "../bot-manager.js";
import axios from "axios";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req.session as any).userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const result = await query(
    "SELECT id, name, avatar, bot_id, status, prefix, intents, permissions, created_at FROM bots WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  res.json(result.rows);
});

router.post("/", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Bot token is required" });
  }

  try {
    const botInfo = await axios.get("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });

    const id = uuidv4();
    const defaultIntents = ["Guilds", "GuildMessages"];
    const defaultModules = ["fun", "utility", "moderation", "welcome", "logging", "automod"];

    await query(
      "INSERT INTO bots (id, user_id, token, name, avatar, bot_id, intents, permissions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        id,
        userId,
        token,
        botInfo.data.username,
        botInfo.data.avatar,
        botInfo.data.id,
        JSON.stringify(defaultIntents),
        JSON.stringify([]),
      ]
    );

    for (const moduleName of defaultModules) {
      const moduleId = uuidv4();
      await query(
        "INSERT INTO bot_modules (id, bot_id, module_name, enabled) VALUES ($1, $2, $3, $4) ON CONFLICT (bot_id, module_name) DO NOTHING",
        [moduleId, id, moduleName, false]
      );
    }

    const newBot = await query("SELECT id, name, avatar, bot_id, status, prefix, intents, permissions, created_at FROM bots WHERE id = $1", [id]);
    res.status(201).json(newBot.rows[0]);
  } catch (error: any) {
    if (error.response?.status === 401) {
      return res.status(400).json({ error: "Invalid bot token" });
    }
    console.error("Bot add error:", error);
    res.status(500).json({ error: "Failed to add bot" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const result = await query(
    "SELECT id, name, avatar, bot_id, status, prefix, intents, permissions, created_at FROM bots WHERE id = $1 AND user_id = $2",
    [req.params.id, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }

  res.json(result.rows[0]);
});

router.put("/:id", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const { prefix, intents, permissions } = req.body;

  const existing = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }

  await query(
    "UPDATE bots SET prefix = COALESCE($1, prefix), intents = COALESCE($2, intents), permissions = COALESCE($3, permissions), updated_at = NOW() WHERE id = $4",
    [prefix, intents ? JSON.stringify(intents) : null, permissions ? JSON.stringify(permissions) : null, req.params.id]
  );

  const updated = await query("SELECT id, name, avatar, bot_id, status, prefix, intents, permissions, created_at FROM bots WHERE id = $1", [req.params.id]);
  res.json(updated.rows[0]);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  await stopBot(req.params.id);
  await query("DELETE FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  res.json({ success: true });
});

router.post("/:id/start", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const existing = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }

  const result = await startBot(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, status: "online" });
});

router.post("/:id/stop", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const existing = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }

  await stopBot(req.params.id);
  res.json({ success: true, status: "offline" });
});

router.get("/:id/invite", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const result = await query("SELECT bot_id, permissions FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }

  const bot = result.rows[0];
  if (!bot.bot_id) {
    return res.status(400).json({ error: "Bot has no Discord ID" });
  }

  const permBits = (bot.permissions || []).reduce((acc: bigint, perm: string) => {
    const PERMS: Record<string, bigint> = {
      Administrator: 8n,
      ManageGuild: 32n,
      ManageRoles: 268435456n,
      ManageChannels: 16n,
      KickMembers: 2n,
      BanMembers: 4n,
      ManageMessages: 8192n,
      EmbedLinks: 16384n,
      AttachFiles: 32768n,
      ReadMessageHistory: 65536n,
      MentionEveryone: 131072n,
      UseExternalEmojis: 262144n,
      ViewAuditLog: 128n,
      SendMessages: 2048n,
      AddReactions: 64n,
      ViewChannel: 1024n,
      Connect: 1048576n,
      Speak: 2097152n,
    };
    return acc | (PERMS[perm] || 0n);
  }, 0n);

  const allowedScopes = ["bot", "applications.commands", "identify", "guilds", "guilds.join", "guilds.members.read", "email"];
  const requestedScopes: string[] = typeof req.query.scopes === "string"
    ? req.query.scopes.split(" ").filter((s) => allowedScopes.includes(s))
    : ["bot", "applications.commands"];

  const scope = requestedScopes.join("+");
  const url = `https://discord.com/api/oauth2/authorize?client_id=${bot.bot_id}&permissions=${permBits.toString()}&scope=${scope}`;
  res.json({ url });
});

router.get("/:id/intents", (_req: Request, res: Response) => {
  res.json(Object.keys(AVAILABLE_INTENTS));
});

router.get("/:id/logs", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const existing = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }
  const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 200);
  const result = await query(
    "SELECT id, level, message, created_at FROM bot_logs WHERE bot_id = $1 ORDER BY created_at DESC LIMIT $2",
    [req.params.id, limit]
  );
  res.json(result.rows.reverse());
});

router.delete("/:id/logs", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const existing = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }
  await query("DELETE FROM bot_logs WHERE bot_id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
