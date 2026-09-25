import { type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Renders a native <a> for external / anchor / mailto / tel hrefs, and a
 * react-router <Link> for internal app routes. Lets CTA components accept any
 * href without breaking client-side navigation.
 */
function isExternal(href: string) {
  return /^(https?:|mailto:|tel:|#)/.test(href);
}

interface SmartLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function SmartLink({ href, className, children }: SmartLinkProps) {
  if (isExternal(href)) {
    const external = /^https?:/.test(href);
    return (
      <a
        href={href}
        className={className}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
