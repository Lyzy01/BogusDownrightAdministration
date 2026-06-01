import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Bot, Save, ExternalLink, Copy, Check, Terminal, Puzzle, ChevronRight,
  Info, Shield, Zap, Radio, Server, MessageSquare, ScrollText,
  BookOpen, ChevronDown, CircleCheck
} from "lucide-react";
import Layout from "../components/Layout";
import { useCurrentUser } from "../App";

interface BotData {
  id: string; name: string; avatar: string; bot_id: string;
  status: string; prefix: string; intents: string[]; permissions: string[];
}

const ALL_INTENTS = [
  { name: "Guilds", desc: "Server/guild events", required: true },
  { name: "GuildMembers", desc: "Member join/leave events", privileged: true },
  { name: "GuildModeration", desc: "Ban/kick events" },
  { name: "GuildMessages", desc: "Message events in guilds" },
  { name: "GuildMessageReactions", desc: "Reaction add/remove events" },
  { name: "MessageContent", desc: "Read message content", privileged: true },
  { name: "GuildVoiceStates", desc: "Voice channel events" },
  { name: "GuildPresences", desc: "User presence updates", privileged: true },
  { name: "GuildEmojisAndStickers", desc: "Emoji/sticker events" },
  { name: "GuildIntegrations", desc: "Integration events" },
  { name: "GuildWebhooks", desc: "Webhook events" },
  { name: "GuildInvites", desc: "Invite create/delete events" },
  { name: "GuildScheduledEvents", desc: "Scheduled event changes" },
  { name: "DirectMessages", desc: "DM events" },
  { name: "DirectMessageReactions", desc: "DM reaction events" },
];

const ALL_PERMISSIONS = [
  { name: "Administrator", desc: "Full admin access", dangerous: true },
  { name: "ManageGuild", desc: "Manage server settings" },
  { name: "ManageRoles", desc: "Create and edit roles" },
  { name: "ManageChannels", desc: "Create and delete channels" },
  { name: "KickMembers", desc: "Remove members from server" },
  { name: "BanMembers", desc: "Ban members from server" },
  { name: "ManageMessages", desc: "Delete and pin messages" },
  { name: "ViewAuditLog", desc: "See audit log entries" },
  { name: "SendMessages", desc: "Send messages in channels" },
  { name: "EmbedLinks", desc: "Embed links in messages" },
  { name: "AttachFiles", desc: "Attach files to messages" },
  { name: "ReadMessageHistory", desc: "Read past messages" },
  { name: "AddReactions", desc: "Add reactions to messages" },
  { name: "UseExternalEmojis", desc: "Use emojis from other servers" },
  { name: "ViewChannel", desc: "View channels" },
  { name: "Connect", desc: "Join voice channels" },
  { name: "Speak", desc: "Speak in voice channels" },
];

export default function BotSetup() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [prefix, setPrefix] = useState("!");
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const { data: bot, isLoading } = useQuery<BotData>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Bot not found");
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (bot) {
      setPrefix(bot.prefix || "!");
      setSelectedIntents(bot.intents || []);
      setSelectedPermissions(bot.permissions || []);
    }
  }, [bot]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prefix, intents: selectedIntents, permissions: selectedPermissions }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot", id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  async function generateInvite() {
    const res = await fetch(`/api/bots/${id}/invite`, { credentials: "include" });
    if (res.ok) {
      const { url } = await res.json();
      setInviteUrl(url);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  if (isLoading) {
    return (
      <Layout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!bot) return null;

  const avatarUrl = bot.avatar && bot.bot_id
    ? `https://cdn.discordapp.com/avatars/${bot.bot_id}/${bot.avatar}.png`
    : null;

  return (
    <Layout breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: bot.name || "Bot Setup" }]}>
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-6 mb-6 border border-white/5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt={bot.name} className="w-16 h-16 rounded-full border-2 border-discord-blurple" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-discord-blurple/20 flex items-center justify-center border-2 border-discord-blurple/30">
                <Bot size={28} className="text-discord-blurple" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">{bot.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-medium ${bot.status === "online" ? "text-discord-green" : "text-discord-light"}`}>
                  {bot.status === "online" ? "● Online" : "○ Offline"}
                </span>
                {bot.bot_id && (
                  <span className="text-xs text-discord-light/50 font-mono">ID: {bot.bot_id}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={`/bots/${id}/modules`}>
                <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 text-discord-light hover:text-white text-sm cursor-pointer transition-all">
                  <Puzzle size={15} /> Modules
                </motion.div>
              </Link>
              <Link href={`/bots/${id}/commands`}>
                <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 text-discord-light hover:text-white text-sm cursor-pointer transition-all">
                  <Terminal size={15} /> Commands
                </motion.div>
              </Link>
              <Link href={`/bots/${id}/logs`}>
                <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-white/10 text-discord-light hover:text-white text-sm cursor-pointer transition-all">
                  <ScrollText size={15} /> Logs
                </motion.div>
              </Link>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-discord-blurple/20 mb-6 overflow-hidden">
          <button
            onClick={() => setGuideOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/3 transition-colors text-left"
            data-testid="button-toggle-guide"
          >
            <div className="w-7 h-7 rounded-lg bg-discord-blurple/20 flex items-center justify-center shrink-0">
              <BookOpen size={14} className="text-discord-blurple" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-white text-sm">Setup Guide</span>
              <span className="text-discord-light/50 text-xs ml-2">How to get your bot online in 4 steps</span>
            </div>
            <ChevronDown size={16} className={`text-discord-light/50 transition-transform duration-200 ${guideOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence initial={false}>
            {guideOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 border-t border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {[
                      {
                        step: 1,
                        title: "Open Discord Developer Portal",
                        desc: "Go to discord.com/developers/applications and open your bot's application.",
                        action: bot?.bot_id ? { label: "Open my bot", href: `https://discord.com/developers/applications/${bot.bot_id}/bot` } : { label: "Open portal", href: "https://discord.com/developers/applications" },
                        color: "discord-blurple",
                      },
                      {
                        step: 2,
                        title: 'Click "Bot" in the sidebar',
                        desc: 'In the left menu of your application, click "Bot" to access bot settings.',
                        color: "discord-fuchsia",
                      },
                      {
                        step: 3,
                        title: "Enable Privileged Intents",
                        desc: 'Scroll to "Privileged Gateway Intents" and turn on: Presence Intent, Server Members Intent, and Message Content Intent.',
                        highlight: ["Presence Intent", "Server Members Intent", "Message Content Intent"],
                        color: "discord-yellow",
                      },
                      {
                        step: 4,
                        title: 'Click "Save Changes" on Discord',
                        desc: 'Hit "Save Changes" on the Discord page, then come back here and click Start on your dashboard.',
                        color: "discord-green",
                      },
                    ].map(({ step, title, desc, action, highlight, color }) => (
                      <div key={step} className="flex gap-3 p-4 rounded-xl bg-white/3 border border-white/5">
                        <div className={`w-7 h-7 rounded-full bg-${color}/20 border border-${color}/30 flex items-center justify-center shrink-0 mt-0.5`}>
                          <span className={`text-xs font-black text-${color}`}>{step}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold mb-1">{title}</p>
                          <p className="text-discord-light/60 text-xs leading-relaxed mb-2">{desc}</p>
                          {highlight && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {highlight.map((h) => (
                                <span key={h} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-discord-yellow/10 border border-discord-yellow/20 text-discord-yellow font-medium">
                                  <CircleCheck size={10} /> {h}
                                </span>
                              ))}
                            </div>
                          )}
                          {action && (
                            <a
                              href={action.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-discord-blurple hover:underline"
                              data-testid={`link-guide-step-${step}`}
                            >
                              <ExternalLink size={10} /> {action.label}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-discord-light/30 text-xs mt-4 text-center">
                    Only needed once per bot — you do not need to repeat this unless you change bots.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-discord-blurple" />
              <h2 className="font-bold text-white">Command Prefix</h2>
            </div>
            <p className="text-discord-light text-sm mb-3">The prefix users type before commands (e.g. !help)</p>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.slice(0, 5))}
              maxLength={5}
              className="w-full px-4 py-3 rounded-xl bg-discord-darkest border border-white/10 text-white font-mono text-lg focus:outline-none focus:border-discord-blurple/50 transition-colors"
              data-testid="input-prefix"
            />
            <p className="text-discord-light/50 text-xs mt-2">Users type: <span className="font-mono text-discord-blurple">{prefix}help</span>, <span className="font-mono text-discord-blurple">{prefix}kick</span>, etc.</p>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink size={16} className="text-discord-green" />
              <h2 className="font-bold text-white">Invite URL</h2>
            </div>
            <p className="text-discord-light text-sm mb-3">Generate a link to add your bot to servers</p>
            {inviteUrl ? (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-lg bg-discord-darkest border border-white/10 text-xs font-mono text-discord-light break-all">
                  {inviteUrl}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyInvite} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple text-xs font-semibold transition-all">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <a href={inviteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-discord-light text-xs font-semibold transition-all">
                    <ExternalLink size={12} /> Open
                  </a>
                </div>
              </div>
            ) : (
              <button onClick={generateInvite} className="w-full px-4 py-3 rounded-xl bg-discord-green/10 hover:bg-discord-green/20 border border-discord-green/20 text-discord-green font-semibold text-sm transition-all">
                Generate Invite URL
              </button>
            )}
          </motion.section>
        </div>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Radio size={16} className="text-discord-fuchsia" />
            <h2 className="font-bold text-white">Gateway Intents</h2>
          </div>
          <p className="text-discord-light text-sm mb-4">Select which Discord events your bot will receive</p>

          {selectedIntents.some((i) => ["GuildMembers", "GuildPresences", "MessageContent"].includes(i)) && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-discord-yellow/8 border border-discord-yellow/25 mb-4">
              <Info size={15} className="text-discord-yellow shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-discord-yellow text-sm font-semibold mb-1">Privileged intents enabled</p>
                <p className="text-discord-yellow/70 text-xs mb-2">
                  You must also enable these in the Discord Developer Portal, or your bot will fail to start.
                </p>
                {bot?.bot_id && (
                  <a
                    href={`https://discord.com/developers/applications/${bot.bot_id}/bot`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-discord-yellow/15 hover:bg-discord-yellow/25 text-discord-yellow text-xs font-bold transition-all"
                    data-testid="link-discord-dev-portal"
                  >
                    <ExternalLink size={11} />
                    Open Discord Dev Portal for this bot
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_INTENTS.map((intent) => (
              <label key={intent.name} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedIntents.includes(intent.name)
                  ? "bg-discord-fuchsia/10 border border-discord-fuchsia/30"
                  : "bg-white/3 border border-white/5 hover:bg-white/5"
              }`}>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={selectedIntents.includes(intent.name)}
                    onChange={() => !intent.required && toggleItem(selectedIntents, setSelectedIntents, intent.name)}
                    disabled={intent.required}
                    data-testid={`toggle-intent-${intent.name}`}
                  />
                  <span className="toggle-slider" />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white font-mono">{intent.name}</span>
                    {intent.privileged && <span className="text-xs px-1.5 py-0.5 rounded-full bg-discord-yellow/10 text-discord-yellow border border-discord-yellow/20">Privileged</span>}
                    {intent.required && <span className="text-xs px-1.5 py-0.5 rounded-full bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20">Required</span>}
                  </div>
                  <p className="text-xs text-discord-light/60 mt-0.5">{intent.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-discord-red" />
            <h2 className="font-bold text-white">Bot Permissions</h2>
          </div>
          <p className="text-discord-light text-sm mb-4">Select permissions for the invite URL. These define what your bot can do in servers.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm.name} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedPermissions.includes(perm.name)
                  ? perm.dangerous ? "bg-red-500/10 border border-red-500/30" : "bg-discord-blurple/10 border border-discord-blurple/30"
                  : "bg-white/3 border border-white/5 hover:bg-white/5"
              }`}>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.name)}
                    onChange={() => toggleItem(selectedPermissions, setSelectedPermissions, perm.name)}
                    data-testid={`toggle-permission-${perm.name}`}
                  />
                  <span className="toggle-slider" style={selectedPermissions.includes(perm.name) && perm.dangerous ? { backgroundColor: "#ed4245" } : undefined} />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{perm.name}</span>
                    {perm.dangerous && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Powerful</span>}
                  </div>
                  <p className="text-xs text-discord-light/60 mt-0.5">{perm.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </motion.section>

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-bold transition-all glow-blurple"
            data-testid="button-save-settings"
          >
            {saved ? <Check size={18} className="text-discord-green" /> : <Save size={18} />}
            {saved ? "Saved!" : saveMutation.isPending ? "Saving..." : "Save Settings"}
          </motion.button>
        </div>
      </div>
    </Layout>
  );
}
