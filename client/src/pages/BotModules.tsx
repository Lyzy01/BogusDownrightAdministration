import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Shield, Gamepad2, Wrench, Smile, FileText, Bot, Zap } from "lucide-react";
import Layout from "../components/Layout";
import { useCurrentUser } from "../App";

interface Module {
  name: string; displayName: string; description: string;
  icon: string; commands: string[]; color: string; enabled: boolean; config: any;
}

const iconMap: Record<string, React.ReactNode> = {
  Shield: <Shield size={22} />,
  Gamepad2: <Gamepad2 size={22} />,
  Wrench: <Wrench size={22} />,
  HandWave: <Smile size={22} />,
  FileText: <FileText size={22} />,
  Bot: <Bot size={22} />,
};

const colorMap: Record<string, string> = {
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  yellow: "text-discord-yellow bg-discord-yellow/10 border-discord-yellow/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  green: "text-discord-green bg-discord-green/10 border-discord-green/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  blurple: "text-discord-blurple bg-discord-blurple/10 border-discord-blurple/20",
};

const enabledBg: Record<string, string> = {
  red: "border-red-500/30 bg-red-500/5",
  yellow: "border-discord-yellow/30 bg-discord-yellow/5",
  blue: "border-blue-500/30 bg-blue-500/5",
  green: "border-discord-green/30 bg-discord-green/5",
  purple: "border-purple-500/30 bg-purple-500/5",
  orange: "border-orange-500/30 bg-orange-500/5",
  blurple: "border-discord-blurple/30 bg-discord-blurple/5",
};

export default function BotModules() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const { data: bot } = useQuery<{ name: string }>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ["modules", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}/modules`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ moduleName, enabled }: { moduleName: string; enabled: boolean }) => {
      const res = await fetch(`/api/bots/${id}/modules/${moduleName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modules", id] }),
  });

  return (
    <Layout breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: bot?.name || "Bot", href: `/bots/${id}` },
      { label: "Modules" },
    ]}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Command Modules</h1>
          <p className="text-discord-light text-sm">Toggle entire categories of commands on or off with a single switch</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-white/5">
                <div className="skeleton h-10 w-10 rounded-xl mb-3" />
                <div className="skeleton h-4 w-32 mb-2" />
                <div className="skeleton h-3 w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules?.map((mod, i) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl p-5 border transition-all ${
                  mod.enabled
                    ? enabledBg[mod.color] || "border-discord-blurple/30 bg-discord-blurple/5"
                    : "glass border-white/5 hover:border-white/10"
                }`}
                data-testid={`module-card-${mod.name}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                    colorMap[mod.color] || colorMap.blurple
                  }`}>
                    {iconMap[mod.icon] || <Zap size={22} />}
                  </div>

                  <label className="toggle-switch mt-1" data-testid={`toggle-module-${mod.name}`}>
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={(e) => toggleMutation.mutate({ moduleName: mod.name, enabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <h3 className="font-bold text-white text-base mb-1">{mod.displayName}</h3>
                <p className="text-discord-light text-sm mb-3 leading-relaxed">{mod.description}</p>

                {mod.commands.length > 0 && (
                  <div>
                    <p className="text-xs text-discord-light/50 mb-2 uppercase tracking-wide">Included commands</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.commands.map((cmd) => (
                        <span
                          key={cmd}
                          className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                            mod.enabled
                              ? colorMap[mod.color] || colorMap.blurple
                              : "bg-white/5 text-discord-light/50 border-white/10"
                          }`}
                        >
                          !{cmd}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {mod.commands.length === 0 && (
                  <p className="text-xs text-discord-light/40 italic">Configurable — set up in server</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
