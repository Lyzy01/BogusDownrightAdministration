import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Plus, Terminal, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight, Bot } from "lucide-react";
import Layout from "../components/Layout";
import { useCurrentUser } from "../App";

interface Command {
  id: string; bot_id: string; name: string; description: string;
  trigger_type: string; response: string; enabled: boolean; created_at: string;
}

export default function BotCommands() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger_type: "prefix", response: "" });
  const [editForm, setEditForm] = useState({ description: "", response: "", trigger_type: "prefix" });
  const [error, setError] = useState("");

  const { data: bot } = useQuery<{ name: string }>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: commands, isLoading } = useQuery<Command[]>({
    queryKey: ["commands", id],
    queryFn: async () => {
      const res = await fetch(`/api/bots/${id}/commands`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/bots/${id}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", id] });
      setForm({ name: "", description: "", trigger_type: "prefix", response: "" });
      setShowForm(false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ cmdId, data }: { cmdId: string; data: Partial<Command> }) => {
      const res = await fetch(`/api/bots/${id}/commands/${cmdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commands", id] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cmdId: string) => {
      await fetch(`/api/bots/${id}/commands/${cmdId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commands", id] }),
  });

  return (
    <Layout breadcrumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: bot?.name || "Bot", href: `/bots/${id}` },
      { label: "Commands" },
    ]}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Custom Commands</h1>
            <p className="text-discord-light text-sm">{commands?.length ?? 0} command{commands?.length !== 1 ? "s" : ""} built</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-semibold text-sm transition-colors"
            data-testid="button-new-command"
          >
            <Plus size={16} /> New Command
          </motion.button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass rounded-2xl p-5 mb-5 border border-discord-blurple/30"
            >
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Terminal size={16} className="text-discord-blurple" /> Build a Command
              </h3>
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-3">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-discord-light mb-1">Command Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. greet"
                    className="w-full px-3 py-2.5 rounded-lg bg-discord-darkest border border-white/10 text-white placeholder-discord-light/40 font-mono text-sm focus:outline-none focus:border-discord-blurple/50"
                    data-testid="input-command-name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-discord-light mb-1">Trigger Type</label>
                  <select
                    value={form.trigger_type}
                    onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-discord-darkest border border-white/10 text-white text-sm focus:outline-none focus:border-discord-blurple/50"
                    data-testid="select-trigger-type"
                  >
                    <option value="prefix">Prefix Command</option>
                    <option value="slash">Slash Command</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-discord-light mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this command do?"
                  className="w-full px-3 py-2.5 rounded-lg bg-discord-darkest border border-white/10 text-white placeholder-discord-light/40 text-sm focus:outline-none focus:border-discord-blurple/50"
                  data-testid="input-command-description"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs text-discord-light mb-1">Bot Response *</label>
                <textarea
                  value={form.response}
                  onChange={(e) => setForm({ ...form, response: e.target.value })}
                  placeholder="What should the bot reply with?"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-discord-darkest border border-white/10 text-white placeholder-discord-light/40 text-sm focus:outline-none focus:border-discord-blurple/50 resize-none"
                  data-testid="input-command-response"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.name || !form.response || createMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-discord-blurple hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                  data-testid="button-create-command"
                >
                  <Check size={14} /> Create Command
                </button>
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="px-4 py-2 rounded-lg glass border border-white/10 text-discord-light text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5">
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-3 w-48" />
              </div>
            ))}
          </div>
        ) : commands?.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border border-white/5">
            <Terminal size={40} className="text-discord-blurple/30 mx-auto mb-3" />
            <h3 className="font-bold text-white mb-1">No commands yet</h3>
            <p className="text-discord-light text-sm mb-4">Create your first custom command</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-[#4752c4] text-white font-semibold text-sm transition-colors"
            >
              Build a Command
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {commands?.map((cmd, i) => (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass rounded-xl border transition-all ${
                    cmd.enabled ? "border-white/5 hover:border-white/10" : "border-white/3 opacity-60"
                  }`}
                  data-testid={`command-card-${cmd.id}`}
                >
                  {editingId === cmd.id ? (
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs text-discord-light mb-1">Description</label>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-discord-darkest border border-white/10 text-white text-sm focus:outline-none focus:border-discord-blurple/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-discord-light mb-1">Response</label>
                        <textarea
                          value={editForm.response}
                          onChange={(e) => setEditForm({ ...editForm, response: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-discord-darkest border border-white/10 text-white text-sm focus:outline-none focus:border-discord-blurple/50 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMutation.mutate({ cmdId: cmd.id, data: editForm })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-discord-blurple text-white text-xs font-semibold"
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg glass border border-white/10 text-discord-light text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-discord-blurple text-sm">!{cmd.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            cmd.trigger_type === "slash"
                              ? "bg-discord-fuchsia/10 text-discord-fuchsia border border-discord-fuchsia/20"
                              : "bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20"
                          }`}>
                            {cmd.trigger_type === "slash" ? "/" : "#"} {cmd.trigger_type}
                          </span>
                        </div>
                        {cmd.description && <p className="text-xs text-discord-light truncate mb-0.5">{cmd.description}</p>}
                        <p className="text-xs text-white/50 truncate">↳ {cmd.response}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateMutation.mutate({ cmdId: cmd.id, data: { enabled: !cmd.enabled } })}
                          className="p-2 rounded-lg hover:bg-white/5 text-discord-light transition-colors"
                          title={cmd.enabled ? "Disable" : "Enable"}
                          data-testid={`button-toggle-command-${cmd.id}`}
                        >
                          {cmd.enabled ? <ToggleRight size={18} className="text-discord-green" /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => { setEditingId(cmd.id); setEditForm({ description: cmd.description, response: cmd.response, trigger_type: cmd.trigger_type }); }}
                          className="p-2 rounded-lg hover:bg-white/5 text-discord-light hover:text-white transition-colors"
                          data-testid={`button-edit-command-${cmd.id}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(cmd.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-discord-light hover:text-red-400 transition-colors"
                          data-testid={`button-delete-command-${cmd.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}
