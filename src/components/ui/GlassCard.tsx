import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GradientButton({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "outline";
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary:
      "bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] text-white hover:shadow-lg hover:shadow-[#6c5ce7]/25 hover:scale-[1.02]",
    outline:
      "border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-white/5 hover:border-[#6c5ce7]/50",
  };

  const cls = cn(base, v[variant], className);

  if (href) {
    return (
      <a href={href} className={cls}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  }

  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("bg-clip-text text-transparent bg-gradient-to-r from-[#6c5ce7] to-[#a855f7]", className)}>
      {children}
    </span>
  );
}

export function GlassCard({ children, className, style, onClick }: { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div className={cn(
      "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-[#6c5ce7]/30",
      className,
    )}
    style={style}
    onClick={onClick}>
      {children}
    </div>
  );
}
