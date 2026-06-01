import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, LayoutDashboard, LogOut, Settings, ChevronRight } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useCurrentUser } from "../App";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function Layout({ children, breadcrumbs }: LayoutProps) {
  const { data: user } = useCurrentUser();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.clear();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 glass-strong fixed left-0 top-0 bottom-0 flex flex-col z-40 border-r border-white/5"
      >
        <div className="p-5 border-b border-white/5">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-discord-blurple flex items-center justify-center glow-blurple group-hover:scale-110 transition-transform">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-lg leading-none">BotForge</span>
                <div className="text-xs text-discord-light mt-0.5">Bot Hosting Platform</div>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location === "/dashboard"} />
        </nav>

        {user && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-9 h-9 rounded-full border-2 border-discord-blurple"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white truncate">{user.username}</div>
                <div className="flex items-center gap-1 text-xs text-discord-light">
                  <SiDiscord size={10} className="text-discord-blurple" />
                  Discord
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-discord-light hover:text-red-400 hover:bg-red-400/10 transition-all group"
            >
              <LogOut size={15} className="group-hover:translate-x-0.5 transition-transform" />
              Sign Out
            </button>
          </div>
        )}
      </motion.aside>

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 glass-strong border-b border-white/5 px-8 py-4">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight size={14} className="text-discord-light/50" />}
                  {crumb.href ? (
                    <Link href={crumb.href}>
                      <span className="text-discord-light hover:text-white transition-colors cursor-pointer">{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="text-white font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 2 }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
          active
            ? "bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30"
            : "text-discord-light hover:text-white hover:bg-white/5"
        }`}
      >
        {icon}
        {label}
      </motion.div>
    </Link>
  );
}
