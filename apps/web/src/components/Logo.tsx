import { Link } from "react-router-dom";

export function Logo({ to = "/", className = "" }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={`group flex items-center gap-2 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient font-heading text-2xl text-dark-900 shadow-gold transition group-hover:shadow-gold-lg">
        T
      </span>
      <span className="font-heading text-2xl tracking-widest text-gold-gradient">TRUESTAKE</span>
    </Link>
  );
}
