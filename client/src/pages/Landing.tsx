import { motion } from "framer-motion";
import { Bot, Shield, Zap, Terminal, ArrowRight, Star, Users, Server } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useCurrentUser } from "../App";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Landing() {
  const { data: user, isLoading } = useCurrentUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user]);

  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get("error");

  const features = [
    { icon: <Bot size={22} />, title: "No Code Required", desc: "Just paste your bot token and toggle features on. No programming knowledge needed.", color: "blurple" },
    { icon: <Zap size={22} />, title: "Instant Deployment", desc: "Your bot goes live in seconds. Start, stop, and restart with a single click.", color: "yellow" },
    { icon: <Shield size={22} />, title: "Built-in Modules", desc: "Moderation, fun commands, utility tools — enable whole command categories with a toggle.", color: "green" },
    { icon: <Terminal size={22} />, title: "Custom Commands", desc: "Build your own commands with custom triggers and responses. No limits.", color: "fuchsia" },
  ];

  const stats = [
    { icon: <Users size={16} />, label: "Active Bots", value: "1,200+" },
    { icon: <Server size={16} />, label: "Servers Served", value: "48K+" },
    { icon: <Star size={16} />, label: "Commands Built", value: "95K+" },
  ];

  if (isLoading) {
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

  return (
    <div className="min-h-screen gradient-bg overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5 glass-strong">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-discord-blurple flex items-center justify-center glow-blurple">
            <Bot size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">BotForge</span>
        </motion.div>

        <motion.a
          href="/api/auth/discord"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-discord-blurple hover:bg-[#4752c4] transition-colors font-semibold text-sm text-white glow-blurple"
        >
          <SiDiscord size={16} />
          Login with Discord
        </motion.a>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-24 pb-20">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
          >
            {error === "oauth_failed" ? "Discord login failed. Please try again." : "Something went wrong. Please try again."}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-discord-blurple/10 border border-discord-blurple/30 text-discord-blurple text-sm font-medium mb-8"
          >
            <Zap size={14} />
            No coding required — ever
          </motion.div>

          <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Host your Discord bot
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-discord-blurple via-purple-400 to-discord-fuchsia">
              without writing code
            </span>
          </h1>

          <p className="text-xl text-discord-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste your token, toggle permissions, enable modules, build commands. Your bot is live in under a minute.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="/api/auth/discord"
              whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(88,101,242,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-discord-blurple hover:bg-[#4752c4] text-white font-bold text-lg transition-all"
            >
              <SiDiscord size={22} />
              Get started free
              <ArrowRight size={18} />
            </motion.a>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl glass border border-white/10 text-discord-light font-medium text-lg cursor-default"
            >
              <Star size={16} className="text-discord-yellow" />
              No credit card required
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-12 mb-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-1.5 text-discord-light text-sm mb-1">
                {stat.icon}
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-6 border border-white/5 hover:border-discord-blurple/30 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl bg-discord-${feat.color}/15 flex items-center justify-center mb-4 text-discord-${feat.color}`}>
                {feat.icon}
              </div>
              <h3 className="font-bold text-lg text-white mb-2">{feat.title}</h3>
              <p className="text-discord-light text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center glass rounded-3xl p-12 border border-discord-blurple/20 glow-blurple"
        >
          <h2 className="text-4xl font-black text-white mb-4">Ready to launch your bot?</h2>
          <p className="text-discord-light mb-8 text-lg">Sign in with Discord and have your bot running in under 60 seconds.</p>
          <motion.a
            href="/api/auth/discord"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-discord-blurple hover:bg-[#4752c4] text-white font-bold text-lg transition-colors"
          >
            <SiDiscord size={22} />
            Sign in with Discord
            <ArrowRight size={18} />
          </motion.a>
        </motion.div>
      </main>

      <footer className="relative z-10 text-center py-8 text-discord-light/50 text-sm border-t border-white/5">
        BotForge &copy; 2026 — Discord Bot Hosting Platform
      </footer>
    </div>
  );
}
