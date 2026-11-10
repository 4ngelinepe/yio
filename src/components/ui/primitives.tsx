import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx, tone as tones, type Tone } from "../../lib/tones";
import type { IconName } from "../../data/content";
import { Icon } from "./Icon";

export function Card({
  children, className, as: Tag = "section", id, labelledBy,
}: {
  children: ReactNode; className?: string; as?: "section" | "div" | "article";
  id?: string; labelledBy?: string;
}) {
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      className={cx("rounded-card border border-line bg-surface shadow-card", className)}
    >
      {children}
    </Tag>
  );
}

/** Cuadrado de color con ícono (los "app icons" de cada bloque). */
export function IconTile({
  icon, tone = "info", size = "md",
}: { icon: IconName; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-10 [&>svg]:size-5", md: "size-12 [&>svg]:size-6", lg: "size-16 [&>svg]:size-8" }[size];
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-tile text-white",
        tones[tone].solid, s,
      )}
    >
      <Icon name={icon} />
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success";
  icon?: ReactNode;
};

export function Button({ variant = "primary", icon, className, children, ...rest }: BtnProps) {
  const v = {
    primary: "bg-primary text-primary-fg hover:opacity-90",
    success: "bg-success text-white hover:opacity-90",
    secondary: "border-2 border-line bg-surface text-ink hover:bg-surface-muted",
  }[variant];
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-tile px-6 py-3 text-base font-medium transition disabled:opacity-60",
        v, className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Tile de métrica: ícono + etiqueta + valor. */
export function StatTile({
  label, value, icon, tone = "info", variant = "soft",
}: { label: string; value: string; icon: IconName; tone?: Tone; variant?: "soft" | "plain" }) {
  const t = tones[tone];
  return (
    <div
      className={cx(
        "rounded-tile border p-5",
        variant === "soft" ? cx(t.soft, t.border) : "border-line bg-surface",
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <span className={cx("text-sm", variant === "soft" ? t.text : "text-muted")}>{label}</span>
      </div>
      <p className={cx("mt-3 text-xl font-medium", t.text)}>{value}</p>
    </div>
  );
}
