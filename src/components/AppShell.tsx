import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, LineChart, Apple, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/nutrition", label: "Food", icon: Apple },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/coach", label: "Coach", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/onboarding");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={cn("mx-auto max-w-2xl px-4 pt-6", hideNav ? "pb-6" : "pb-28")}>
        {children}
      </main>
      {!hideNav && <BottomNav pathname={location.pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-14 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
