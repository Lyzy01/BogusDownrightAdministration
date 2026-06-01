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

router.use(requireAuth, requireBotOwner);

router.get("/", async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM bot_commands WHERE bot_id = $1 ORDER BY created_at ASC",
    [req.params.botId]
  );
  res.json(result.rows);
});

router.post("/", async (req: Request, res: Response) => {
  const { name, description, trigger_type, response } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Command name is required" });
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const existing = await query(
    "SELECT id FROM bot_commands WHERE bot_id = $1 AND name = $2",
    [req.params.botId, cleanName]
  );

  if (existing.rows.length > 0) {
    return res.status(400).json({ error: "Command with this name already exists" });
  }

  const id = uuidv4();
  await query(
    "INSERT INTO bot_commands (id, bot_id, name, description, trigger_type, response) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, req.params.botId, cleanName, description || "", trigger_type || "prefix", response || ""]
  );

  const result = await query("SELECT * FROM bot_commands WHERE id = $1", [id]);
  res.status(201).json(result.rows[0]);
});

router.put("/:cmdId", async (req: Request, res: Response) => {
  const { description, response, enabled, trigger_type } = req.body;

  await query(
    "UPDATE bot_commands SET description = COALESCE($1, description), response = COALESCE($2, response), enabled = COALESCE($3, enabled), trigger_type = COALESCE($4, trigger_type), updated_at = NOW() WHERE id = $5 AND bot_id = $6",
    [description, response, enabled, trigger_type, req.params.cmdId, req.params.botId]
  );

  const result = await query("SELECT * FROM bot_commands WHERE id = $1", [req.params.cmdId]);
  res.json(result.rows[0]);
});

router.delete("/:cmdId", async (req: Request, res: Response) => {
  await query("DELETE FROM bot_commands WHERE id = $1 AND bot_id = $2", [req.params.cmdId, req.params.botId]);
  res.json({ success: true });
});

export default router;
