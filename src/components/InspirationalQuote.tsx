import { Quote } from "lucide-react";

export function InspirationalQuote({ text }: { text: string }) {
  return (
    <figure className="relative overflow-hidden rounded-card border border-line bg-surface-muted px-8 py-10 sm:px-24">
      <Quote aria-hidden className="absolute -bottom-4 left-4 size-24 rotate-180 text-line" />
      <Quote aria-hidden className="absolute -top-4 right-4 size-24 text-line" />
      <blockquote className="relative text-center text-lg italic text-ink sm:text-xl">
        "{text}"
      </blockquote>
    </figure>
  );
}
