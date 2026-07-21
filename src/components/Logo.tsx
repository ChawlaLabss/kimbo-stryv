import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <defs>
          <linearGradient id="strv-g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.72 0.22 25)" />
            <stop offset="1" stopColor="oklch(0.5 0.2 20)" />
          </linearGradient>
        </defs>
        <path
          d="M6 6 L20 32 L34 6 L28 6 L20 22 L12 6 Z"
          fill="url(#strv-g)"
        />
        <path d="M18 24 L22 24 L20 28 Z" fill="oklch(0.98 0 0)" />
      </svg>
      {showText && (
        <span className="font-display text-xl font-black tracking-tight">
          STR<span className="text-primary">V</span>
        </span>
      )}
    </div>
  );
}
