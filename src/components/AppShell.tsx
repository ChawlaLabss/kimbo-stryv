import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, CalendarDays, Apple, MessageSquare, User, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/plan", label: "Plan", icon: ClipboardList },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/nutrition", label: "Food", icon: Apple },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/coach", label: "Coach", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/onboarding");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={cn("mx-auto max-w-2xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))]", hideNav ? "pb-6" : "pb-[calc(7rem+env(safe-area-inset-bottom))]")}>
        {children}
      </main>
      {!hideNav && <BottomNav pathname={location.pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-12 shrink-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors",
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
