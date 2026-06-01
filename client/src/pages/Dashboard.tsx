import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, Bot, Power, Trash2, Settings, ExternalLink, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import Layout from "../components/Layout";
import { useCurrentUser } from "../App";

interface BotData {
  id: string;
  name: string;
  avatar: string;
  bot_id: string;
  status: "online" | "offline" | "error";
  prefix: string;
  intents: string[];
  permissions: string[];
  created_at: string;
}

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");
  const [showAddBot, setShowAddBot] = useState(false);
  const [addError, setAddError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [botErrors, setBotErrors] = useState<Record<string, string>>({});

  const { data: bots, isLoading: botsLoading } = useQuery<BotData[]>({
    queryKey: ["bots"],
    queryFn: async () => {
      const res = await fetch("/api/bots", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bots");
      return res.json();
    },
    enabled: !!user,
  });

  const addBotMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add bot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      setTokenInput("");
      setShowAddBot(false);
      setAddError("");
    },
    onError: (e: Error) => setAddError(e.message),
  });

  const toggleBotMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "start" | "stop" }) => {
      const res = await fetch(`/api/bots/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return { ...await res.json(), botId: id, action };
    },
    onSuccess: (data) => {
      setBotErrors((prev) => { const n = { ...prev }; delete n[data.botId]; return n; });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (e: Error, vars) => {
      if (vars.action === "start") {
        setBotErrors((prev) => ({ ...prev, [vars.id]: e.message }));
      }
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });

  const deleteBotMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bots/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bots"] }),
  });

  if (userLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-discord-blurple border-t-transparent rounded-full"
        />
      </div>
    );
  }

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  if (!userLoading && !user) return null;

  async function copyInvite(botId: string) {
    const res = await fetch(`/api/bots/${botId}/invite`, { credentials: "include" });
    if (res.ok) {
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      setCopiedId(botId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <Layout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-black text-white mb-1"
            >
              Your Bots
            </motion.h1>
            <p className="text-discord-light text-sm">
              {bots?.length ?? 0} bot{bots?.length !== 1 ? "s" : ""} configured
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddBot(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-semibold text-sm transition-colors glow-blurple"
          >
            <Plus size={18} />
            Add Bot
          </motion.button>
        </div>

        <AnimatePresence>
          {showAddBot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 mb-6 border border-discord-blurple/30"
            >
              <h3 className="font-bold text-white mb-1">Add a Discord Bot</h3>
              <p className="text-discord-light text-sm mb-4">
                Paste your bot token from the{" "}
                <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-discord-blurple hover:underline">
                  Discord Developer Portal
                </a>
              </p>

              {addError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertCircle size={14} />
                  {addError}
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Bot token (e.g. MTExxx.Gxxxxx...)"
                  className="flex-1 px-4 py-3 rounded-xl bg-discord-darkest border border-white/10 text-white placeholder-discord-light/50 font-mono text-sm focus:outline-none focus:border-discord-blurple/50 transition-colors"
                  data-testid="input-bot-token"
                />
                <button
                  onClick={() => addBotMutation.mutate(tokenInput)}
                  disabled={!tokenInput || addBotMutation.isPending}
                  className="px-5 py-3 rounded-xl bg-discord-blurple hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center gap-2"
                  data-testid="button-add-bot"
                >
                  {addBotMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Bot
                </button>
                <button
                  onClick={() => { setShowAddBot(false); setAddError(""); setTokenInput(""); }}
                  className="px-4 py-3 rounded-xl glass border border-white/10 text-discord-light hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {botsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="skeleton w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton h-4 w-32 mb-2" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
                <div className="skeleton h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : bots?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 glass rounded-2xl border border-white/5"
          >
            <div className="w-20 h-20 rounded-2xl bg-discord-blurple/10 flex items-center justify-center mx-auto mb-4">
              <Bot size={36} className="text-discord-blurple/50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No bots yet</h3>
            <p className="text-discord-light text-sm mb-6">Add your first bot to get started</p>
            <button
              onClick={() => setShowAddBot(true)}
              className="px-6 py-3 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-semibold text-sm transition-colors"
            >
              Add your first bot
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {bots?.map((bot, i) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors group"
                  data-testid={`card-bot-${bot.id}`}
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className="relative">
                      {bot.avatar && bot.bot_id ? (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${bot.bot_id}/${bot.avatar}.png`}
                          alt={bot.name}
                          className="w-14 h-14 rounded-full border-2 border-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-discord-blurple/20 flex items-center justify-center border-2 border-white/10">
                          <Bot size={24} className="text-discord-blurple" />
                        </div>
                      )}
                      <span className={`status-dot absolute -bottom-0.5 -right-0.5 border-2 border-discord-darker status-${bot.status}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg leading-tight truncate">{bot.name || "Unnamed Bot"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${
                          bot.status === "online" ? "text-discord-green" :
                          bot.status === "error" ? "text-discord-red" : "text-discord-light"
                        }`}>
                          {bot.status === "online" ? "Online" : bot.status === "error" ? "Error" : "Offline"}
                        </span>
                        <span className="text-discord-light/30">·</span>
                        <span className="text-xs text-discord-light font-mono">prefix: {bot.prefix || "!"}</span>
                      </div>
                      {botErrors[bot.id] && (
                        <div className="flex items-start gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-red-400">{botErrors[bot.id]}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteBotMutation.mutate(bot.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-discord-light hover:text-red-400 transition-all"
                      data-testid={`button-delete-bot-${bot.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleBotMutation.mutate({ id: bot.id, action: bot.status === "online" ? "stop" : "start" })}
                      disabled={toggleBotMutation.isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        bot.status === "online"
                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          : "bg-discord-green/10 hover:bg-discord-green/20 text-discord-green border border-discord-green/20"
                      }`}
                      data-testid={`button-toggle-bot-${bot.id}`}
                    >
                      <Power size={12} />
                      {bot.status === "online" ? "Stop" : "Start"}
                    </motion.button>

                    <Link href={`/bots/${bot.id}`}>
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/20 cursor-pointer transition-all"
                        data-testid={`link-setup-bot-${bot.id}`}
                      >
                        <Settings size={12} />
                        Setup
                      </motion.div>
                    </Link>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      onClick={() => copyInvite(bot.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-discord-light border border-white/10 transition-all"
                      data-testid={`button-invite-bot-${bot.id}`}
                    >
                      {copiedId === bot.id ? <Check size={12} className="text-discord-green" /> : <Copy size={12} />}
                      {copiedId === bot.id ? "Copied!" : "Invite URL"}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}
