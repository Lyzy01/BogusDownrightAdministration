import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Terminal, Trash2, RefreshCw, ArrowDown, Bot, Puzzle } from "lucide-react";
import Layout from "../components/Layout";
import { useCurrentUser } from "../App";

interface BotLog {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  created_at: string;
}

interface BotData {
  id: string;
  name: string;
  avatar: string;
  bot_id: string;
  status: string;
}

const LEVEL_STYLES = {
  info:  { text: "text-discord-light", badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20", prefix: "INFO " },
  warn:  { text: "text-discord-yellow", badge: "text-yellow-300 bg-yellow-500/10 border border-yellow-500/20", prefix: "WARN " },
  error: { text: "text-discord-red", badge: "text-red-300 bg-red-500/10 border border-red-500/20", prefix: "ERROR" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function BotLogs() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">("all");

  const { data: bot } = useQuery<BotData>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Bot not found");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading, dataUpdatedAt } = useQuery<BotLog[]>({
    queryKey: ["bot-logs", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}/logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bots/${id}/logs`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to clear logs");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bot-logs", id] }),
  });

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const counts = {
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
  };

  const avatarUrl = bot?.avatar && bot?.bot_id
    ? `https://cdn.discordapp.com/avatars/${bot.bot_id}/${bot.avatar}.png`
    : null;

  return (
    <Layout breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: bot?.name || "Bot", href: `/bots/${id}` },
      { label: "Logs" }
    ]}>
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-6 mb-6 border border-white/5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt={bot?.name} className="w-16 h-16 rounded-full border-2 border-discord-blurple" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-discord-blurple/20 flex items-center justify-center border-2 border-discord-blurple/30">
                <Bot size={28} className="text-discord-blurple" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">{bot?.name || "Bot Logs"}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-medium ${bot?.status === "online" ? "text-discord-green" : "text-discord-light"}`}>
                  {bot?.status === "online" ? "● Online" : "○ Offline"}
                </span>
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
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <Terminal size={16} className="text-discord-blurple" />
            <span className="font-bold text-white text-sm">Activity Log</span>
            <span className="text-xs text-discord-light/50 ml-1">
              {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {(["all", "info", "warn", "error"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  data-testid={`filter-logs-${f}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? "bg-discord-blurple text-white"
                      : "text-discord-light hover:text-white hover:bg-white/5"
                  }`}
                >
                  {f === "all" ? `All (${logs.length})` : f === "info" ? `Info (${counts.info})` : f === "warn" ? `Warn (${counts.warn})` : `Error (${counts.error})`}
                </button>
              ))}

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                onClick={() => setAutoScroll((v) => !v)}
                data-testid="button-autoscroll"
                className={`p-1.5 rounded-lg transition-all ${autoScroll ? "text-discord-blurple bg-discord-blurple/10" : "text-discord-light hover:text-white hover:bg-white/5"}`}
                title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
              >
                <ArrowDown size={13} />
              </button>

              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["bot-logs", id] })}
                data-testid="button-refresh-logs"
                className="p-1.5 rounded-lg text-discord-light hover:text-white hover:bg-white/5 transition-all"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>

              <button
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending || logs.length === 0}
                data-testid="button-clear-logs"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-discord-light hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          </div>

          <div
            className="h-[480px] overflow-y-auto font-mono text-xs p-4 space-y-0.5 bg-discord-darkest/60"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              setAutoScroll(atBottom);
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-discord-light/40">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-discord-light/30 gap-2">
                <Terminal size={28} />
                <span>{filter === "all" ? "No logs yet — start your bot to see activity here" : `No ${filter} logs`}</span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredLogs.map((log, i) => {
                  const style = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info;
                  const prevLog = filteredLogs[i - 1];
                  const showDate = !prevLog || formatDate(prevLog.created_at) !== formatDate(log.created_at);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {showDate && (
                        <div className="flex items-center gap-2 my-3 text-discord-light/20">
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-xs">{formatDate(log.created_at)}</span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                      )}
                      <div className={`flex items-start gap-3 py-0.5 hover:bg-white/3 rounded px-1 group`} data-testid={`log-entry-${log.id}`}>
                        <span className="text-discord-light/30 shrink-0 tabular-nums">{formatTime(log.created_at)}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums ${style.badge}`}>{style.prefix}</span>
                        <span className={`${style.text} leading-relaxed break-all`}>{log.message}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-discord-light/40">
            <span>{filteredLogs.length} {filter === "all" ? "total" : filter} {filteredLogs.length === 1 ? "entry" : "entries"} · auto-refreshes every 3s</span>
            <span>Last 200 entries kept</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
