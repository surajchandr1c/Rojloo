import Link from "next/link";
import { navLinks, policyLinks } from "@/lib/nav";

export default function Footer() {
  return (
    <footer className="border-t border-red-950/30 bg-red-950 px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-black !text-white">rojlo</p>
          <p className="mt-2 max-w-md text-sm leading-6 !text-white">
            Find services, explore places, and post ads in one simple local
            marketplace.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold !text-white">Navigate</p>
          <ul className="mt-3 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium !text-white transition-colors hover:!text-white"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold !text-white">Policies</p>
          <ul className="mt-3 space-y-2">
            {policyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium !text-white transition-colors hover:!text-white"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-6xl border-t border-red-900 pt-5 text-sm !text-white">
        <p>© {new Date().getFullYear()} rojlo. All rights reserved.</p>
      </div>
    </footer>
  );
}
