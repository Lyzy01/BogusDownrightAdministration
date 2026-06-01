import { Route, Switch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import BotSetup from "./pages/BotSetup";
import BotCommands from "./pages/BotCommands";
import BotModules from "./pages/BotModules";
import NotFound from "./pages/NotFound";

export interface User {
  id: string;
  discord_id: string;
  username: string;
  discriminator: string;
  avatar: string;
  avatarUrl: string;
  email: string;
}

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });
}

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bots/:id" component={BotSetup} />
      <Route path="/bots/:id/commands" component={BotCommands} />
      <Route path="/bots/:id/modules" component={BotModules} />
      <Route component={NotFound} />
    </Switch>
  );
}
