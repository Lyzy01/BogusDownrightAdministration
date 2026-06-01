import { Client, GatewayIntentBits, Events, Message } from "discord.js";
import { query } from "./db.js";
import { v4 as uuidv4 } from "uuid";

async function addLog(botId: string, level: "info" | "warn" | "error", message: string) {
  try {
    await query(
      "INSERT INTO bot_logs (id, bot_id, level, message) VALUES ($1, $2, $3, $4)",
      [uuidv4(), botId, level, message]
    );
    await query(
      "DELETE FROM bot_logs WHERE bot_id = $1 AND id NOT IN (SELECT id FROM bot_logs WHERE bot_id = $1 ORDER BY created_at DESC LIMIT 200)",
      [botId]
    );
  } catch (_) {}
}

interface BotInstance {
  client: Client;
  botId: string;
  status: "online" | "offline" | "error";
}

const activeBots = new Map<string, BotInstance>();

const AVAILABLE_INTENTS: Record<string, number> = {
  Guilds: GatewayIntentBits.Guilds,
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildModeration: GatewayIntentBits.GuildModeration,
  GuildEmojisAndStickers: GatewayIntentBits.GuildEmojisAndStickers,
  GuildIntegrations: GatewayIntentBits.GuildIntegrations,
  GuildWebhooks: GatewayIntentBits.GuildWebhooks,
  GuildInvites: GatewayIntentBits.GuildInvites,
  GuildVoiceStates: GatewayIntentBits.GuildVoiceStates,
  GuildPresences: GatewayIntentBits.GuildPresences,
  GuildMessages: GatewayIntentBits.GuildMessages,
  GuildMessageReactions: GatewayIntentBits.GuildMessageReactions,
  GuildMessageTyping: GatewayIntentBits.GuildMessageTyping,
  DirectMessages: GatewayIntentBits.DirectMessages,
  DirectMessageReactions: GatewayIntentBits.DirectMessageReactions,
  DirectMessageTyping: GatewayIntentBits.DirectMessageTyping,
  MessageContent: GatewayIntentBits.MessageContent,
  GuildScheduledEvents: GatewayIntentBits.GuildScheduledEvents,
  AutoModerationConfiguration: GatewayIntentBits.AutoModerationConfiguration,
  AutoModerationExecution: GatewayIntentBits.AutoModerationExecution,
};

export async function startBot(botDbId: string): Promise<{ success: boolean; error?: string }> {
  if (activeBots.has(botDbId)) {
    return { success: true };
  }

  const result = await query("SELECT * FROM bots WHERE id = $1", [botDbId]);
  if (result.rows.length === 0) {
    return { success: false, error: "Bot not found" };
  }

  const bot = result.rows[0];
  const intentNames: string[] = bot.intents || ["Guilds", "GuildMessages"];

  const intentBits = intentNames
    .filter((name) => AVAILABLE_INTENTS[name])
    .map((name) => AVAILABLE_INTENTS[name]);

  const client = new Client({
    intents: intentBits.length > 0 ? intentBits : [GatewayIntentBits.Guilds],
  });

  await addLog(botDbId, "info", "Attempting to connect to Discord...");

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Login timeout after 15s — check your token and privileged intents")), 15000);

      client.once(Events.ClientReady, async (readyClient) => {
        clearTimeout(timeout);
        await query(
          "UPDATE bots SET status = $1, name = $2, avatar = $3, bot_id = $4, updated_at = NOW() WHERE id = $5",
          ["online", readyClient.user.username, readyClient.user.avatar, readyClient.user.id, botDbId]
        );
        await addLog(botDbId, "info", `Connected as ${readyClient.user.username} (${readyClient.user.id})`);
        await addLog(botDbId, "info", `Bot is online and ready to receive commands`);
        resolve();
      });

      client.on(Events.MessageCreate, async (message: Message) => {
        if (message.author.bot) return;
        const prefix = bot.prefix || "!";
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const cmdResult = await query(
          "SELECT * FROM bot_commands WHERE bot_id = $1 AND name = $2 AND enabled = true",
          [botDbId, commandName]
        );

        if (cmdResult.rows.length > 0) {
          const cmd = cmdResult.rows[0];
          await message.reply(cmd.response || "Command executed!");
          await addLog(botDbId, "info", `Command "${commandName}" executed by ${message.author.tag} in #${(message.channel as any).name ?? "DM"}`);
        }

        const modulesResult = await query(
          "SELECT * FROM bot_modules WHERE bot_id = $1 AND enabled = true",
          [botDbId]
        );

        const enabledModules = modulesResult.rows.map((r) => r.module_name);

        if (enabledModules.includes("moderation")) {
          if (commandName === "kick" && message.member?.permissions.has("KickMembers")) {
            const target = message.mentions.members?.first();
            if (target) {
              await target.kick(args.slice(1).join(" ") || "No reason");
              await message.reply(`Kicked ${target.user.tag}`);
              await addLog(botDbId, "warn", `Kicked ${target.user.tag} — requested by ${message.author.tag}`);
            }
          }
          if (commandName === "ban" && message.member?.permissions.has("BanMembers")) {
            const target = message.mentions.members?.first();
            if (target) {
              await target.ban({ reason: args.slice(1).join(" ") || "No reason" });
              await message.reply(`Banned ${target.user.tag}`);
              await addLog(botDbId, "warn", `Banned ${target.user.tag} — requested by ${message.author.tag}`);
            }
          }
          if (commandName === "clear" && message.member?.permissions.has("ManageMessages")) {
            const amount = parseInt(args[0]) || 10;
            await message.channel.bulkDelete(Math.min(amount, 100));
            const msg = await message.channel.send(`Deleted ${amount} messages`);
            setTimeout(() => msg.delete(), 3000);
            await addLog(botDbId, "warn", `Cleared ${amount} messages in #${(message.channel as any).name ?? "channel"} by ${message.author.tag}`);
          }
        }

        if (enabledModules.includes("fun")) {
          if (commandName === "ping") {
            await message.reply(`Pong! Latency: ${client.ws.ping}ms`);
            await addLog(botDbId, "info", `Ping command — latency ${client.ws.ping}ms`);
          }
          if (commandName === "roll") {
            const sides = parseInt(args[0]) || 6;
            const result = Math.floor(Math.random() * sides) + 1;
            await message.reply(`You rolled a ${result} (d${sides})`);
            await addLog(botDbId, "info", `Roll d${sides} by ${message.author.tag} — result: ${result}`);
          }
          if (commandName === "flip") {
            const result = Math.random() > 0.5 ? "Heads" : "Tails";
            await message.reply(`${result}!`);
            await addLog(botDbId, "info", `Coin flip by ${message.author.tag} — ${result}`);
          }
          if (commandName === "8ball") {
            const answers = [
              "It is certain.", "Without a doubt.", "Yes definitely.", "Most likely.",
              "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.",
              "Ask again later.", "Better not tell you now.", "Cannot predict now.",
              "Don't count on it.", "My reply is no.", "My sources say no.",
              "Outlook not so good.", "Very doubtful."
            ];
            const answer = answers[Math.floor(Math.random() * answers.length)];
            await message.reply(answer);
            await addLog(botDbId, "info", `8ball by ${message.author.tag} — "${answer}"`);
          }
        }

        if (enabledModules.includes("utility")) {
          if (commandName === "serverinfo") {
            const guild = message.guild;
            if (guild) {
              await message.reply(
                `**Server:** ${guild.name}\n**Members:** ${guild.memberCount}\n**Created:** ${guild.createdAt.toDateString()}`
              );
              await addLog(botDbId, "info", `Serverinfo requested by ${message.author.tag} in ${guild.name}`);
            }
          }
          if (commandName === "userinfo") {
            const target = message.mentions.members?.first() || message.member;
            if (target) {
              await message.reply(
                `**User:** ${target.user.tag}\n**Joined:** ${target.joinedAt?.toDateString()}\n**ID:** ${target.user.id}`
              );
              await addLog(botDbId, "info", `Userinfo for ${target.user.tag} requested by ${message.author.tag}`);
            }
          }
          if (commandName === "avatar") {
            const target = message.mentions.users.first() || message.author;
            await message.reply(target.displayAvatarURL({ size: 512 }));
            await addLog(botDbId, "info", `Avatar requested for ${target.tag} by ${message.author.tag}`);
          }
        }
      });

      client.on(Events.Error, async (error) => {
        await addLog(botDbId, "error", `Discord client error: ${error.message}`);
      });

      client.on(Events.Warn, async (warning) => {
        await addLog(botDbId, "warn", warning);
      });

      client.login(bot.token).catch(reject);
    });

    activeBots.set(botDbId, { client, botId: botDbId, status: "online" });
    return { success: true };
  } catch (error) {
    client.destroy();
    const errMsg = (error as Error).message;
    await query("UPDATE bots SET status = $1, updated_at = NOW() WHERE id = $2", ["error", botDbId]);
    await addLog(botDbId, "error", `Failed to start: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

export async function stopBot(botDbId: string): Promise<void> {
  const instance = activeBots.get(botDbId);
  if (instance) {
    instance.client.destroy();
    activeBots.delete(botDbId);
  }
  await query("UPDATE bots SET status = $1, updated_at = NOW() WHERE id = $2", ["offline", botDbId]);
  await addLog(botDbId, "info", "Bot stopped and disconnected from Discord");
}

export function getBotStatus(botDbId: string): string {
  const instance = activeBots.get(botDbId);
  return instance ? instance.status : "offline";
}

export function getActiveBotsCount(): number {
  return activeBots.size;
}

export { AVAILABLE_INTENTS };
