import { cn } from "@/lib/utils";
import logoAsset from "@/assets/strv-logo.png.asset.json";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoAsset.url}
        alt="STRYV logo"
        className="h-8 w-8 object-contain"
      />
      {showText && (
        <span className="font-display text-xl font-black tracking-tight">
          STR<span className="text-primary">V</span>
        </span>
      )}
    </div>
  );
}
