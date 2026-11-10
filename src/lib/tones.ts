/**
 * Tonos semánticos → clases de Tailwind.
 * Las clases están escritas completas para que Tailwind las detecte.
 */
export type Tone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "highlight"
  | "energy"
  | "neutral";

export const tone: Record<
  Tone,
  { solid: string; soft: string; border: string; text: string; fg: string }
> = {
  info: { solid: "bg-info", soft: "bg-info-soft", border: "border-info-border", text: "text-info-text", fg: "text-info" },
  success: { solid: "bg-success", soft: "bg-success-soft", border: "border-success-border", text: "text-success-text", fg: "text-success" },
  warning: { solid: "bg-warning", soft: "bg-warning-soft", border: "border-warning-border", text: "text-warning-text", fg: "text-warning" },
  danger: { solid: "bg-danger", soft: "bg-danger-soft", border: "border-danger-border", text: "text-danger-text", fg: "text-danger" },
  highlight: { solid: "bg-highlight", soft: "bg-highlight-soft", border: "border-highlight-border", text: "text-highlight-text", fg: "text-highlight" },
  energy: { solid: "bg-energy", soft: "bg-energy-soft", border: "border-energy-border", text: "text-energy-text", fg: "text-energy" },
  neutral: { solid: "bg-neutral", soft: "bg-neutral-soft", border: "border-neutral-border", text: "text-neutral-text", fg: "text-neutral" },
};

export const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");
