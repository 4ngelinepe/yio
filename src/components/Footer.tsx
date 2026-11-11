import { Fragment } from "react";
import { brand } from "../config/brand";
import { footerLinks } from "../data/content";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center">
        <nav className="flex items-center justify-center gap-4 text-muted sm:gap-8">
          {footerLinks.map((l, i) => (
            <Fragment key={l}>
              {i > 0 && <span className="text-subtle">·</span>}
              <a href="#" className="hover:text-ink">{l}</a>
            </Fragment>
          ))}
        </nav>
        <p className="mt-4 text-sm text-subtle">
          © {brand.year} {brand.productName} · {brand.siteName}
        </p>
      </div>
    </footer>
  );
}
