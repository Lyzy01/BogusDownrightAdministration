import { Router, Request, Response } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3001"}/api/auth/callback`;

router.get("/discord", (req: Request, res: Response) => {
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({ error: "Discord OAuth not configured. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET." });
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get("/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect("/?error=no_code");
  }

  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = Date.now() + expires_in * 1000;

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userRes.data;

    const existingUser = await query("SELECT id FROM users WHERE discord_id = $1", [discordUser.id]);

    let userId: string;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      await query(
        "UPDATE users SET username = $1, discriminator = $2, avatar = $3, email = $4, access_token = $5, refresh_token = $6, token_expires_at = $7, updated_at = NOW() WHERE id = $8",
        [discordUser.username, discordUser.discriminator || "0", discordUser.avatar, discordUser.email, access_token, refresh_token, expiresAt, userId]
      );
    } else {
      userId = uuidv4();
      await query(
        "INSERT INTO users (id, discord_id, username, discriminator, avatar, email, access_token, refresh_token, token_expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [userId, discordUser.id, discordUser.username, discordUser.discriminator || "0", discordUser.avatar, discordUser.email, access_token, refresh_token, expiresAt]
      );
    }

    (req.session as any).userId = userId;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("OAuth error:", error);
    res.redirect("/?error=oauth_failed");
  }
});

router.get("/me", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const result = await query(
    "SELECT id, discord_id, username, discriminator, avatar, email, created_at FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }

  const user = result.rows[0];
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discord_id) % 5}.png`;

  res.json({ ...user, avatarUrl });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.json({ success: true });
  });
});

export default router;
