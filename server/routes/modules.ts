import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";

const router = Router({ mergeParams: true });

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req.session as any).userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function requireBotOwner(req: Request, res: Response, next: Function) {
  const userId = (req.session as any).userId;
  const result = await query("SELECT id FROM bots WHERE id = $1 AND user_id = $2", [req.params.botId, userId]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Bot not found" });
  }
  next();
}

export const MODULE_DEFINITIONS = [
  {
    name: "moderation",
    displayName: "Moderation",
    description: "Kick, ban, mute, and manage members",
    icon: "Shield",
    commands: ["kick", "ban", "unban", "mute", "unmute", "clear", "warn"],
    color: "red",
  },
  {
    name: "fun",
    displayName: "Fun",
    description: "Games, jokes, and entertainment commands",
    icon: "Gamepad2",
    commands: ["ping", "roll", "flip", "8ball", "joke", "meme"],
    color: "yellow",
  },
  {
    name: "utility",
    displayName: "Utility",
    description: "Helpful utility commands for server management",
    icon: "Wrench",
    commands: ["serverinfo", "userinfo", "avatar", "poll", "remind"],
    color: "blue",
  },
  {
    name: "welcome",
    displayName: "Welcome",
    description: "Greet new members with custom messages",
    icon: "HandWave",
    commands: [],
    color: "green",
  },
  {
    name: "logging",
    displayName: "Logging",
    description: "Log server events to a channel",
    icon: "FileText",
    commands: [],
    color: "purple",
  },
  {
    name: "automod",
    displayName: "Auto Moderation",
    description: "Automatically moderate messages and content",
    icon: "Bot",
    commands: [],
    color: "orange",
  },
];

router.use(requireAuth, requireBotOwner);

router.get("/", async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM bot_modules WHERE bot_id = $1",
    [req.params.botId]
  );

  const moduleMap = new Map(result.rows.map((r) => [r.module_name, r]));

  const modules = MODULE_DEFINITIONS.map((def) => ({
    ...def,
    enabled: moduleMap.get(def.name)?.enabled || false,
    config: moduleMap.get(def.name)?.config || {},
  }));

  res.json(modules);
});

router.put("/:moduleName", async (req: Request, res: Response) => {
  const { enabled, config } = req.body;
  const { botId, moduleName } = req.params;

  const validModule = MODULE_DEFINITIONS.find((m) => m.name === moduleName);
  if (!validModule) {
    return res.status(400).json({ error: "Invalid module name" });
  }

  const existing = await query(
    "SELECT id FROM bot_modules WHERE bot_id = $1 AND module_name = $2",
    [botId, moduleName]
  );

  if (existing.rows.length > 0) {
    await query(
      "UPDATE bot_modules SET enabled = COALESCE($1, enabled), config = COALESCE($2, config) WHERE bot_id = $3 AND module_name = $4",
      [enabled, config ? JSON.stringify(config) : null, botId, moduleName]
    );
  } else {
    const id = uuidv4();
    await query(
      "INSERT INTO bot_modules (id, bot_id, module_name, enabled, config) VALUES ($1, $2, $3, $4, $5)",
      [id, botId, moduleName, enabled ?? false, JSON.stringify(config || {})]
    );
  }

  const result = await query(
    "SELECT * FROM bot_modules WHERE bot_id = $1 AND module_name = $2",
    [botId, moduleName]
  );

  const row = result.rows[0];
  const def = MODULE_DEFINITIONS.find((m) => m.name === moduleName)!;
  res.json({ ...def, enabled: row.enabled, config: row.config });
});

export default router;
