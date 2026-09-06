import Link from "next/link";
import Image from "next/image";
import { navLinks, policyLinks } from "@/lib/nav";

export default function Footer() {
  return (
    <footer className="border-t border-red-950/30 bg-red-950 px-4 py-8 text-white w-full">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
        <div className="flex items-center gap-4 sm:col-span-2">
          <Link href="/" className="shrink-0 hover:opacity-90 transition">
            <Image
              src="/favicon.png"
              alt="Rojlo Logo"
              width={120}
              height={120}
              className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 object-contain drop-shadow-md"
            />
          </Link>
          <div>
            <p className="text-xl sm:text-2xl font-black !text-white">rojlo</p>
            <p className="mt-1.5 max-w-sm text-xs sm:text-sm leading-relaxed text-red-100">
              Find services, explore places, and post ads in one simple local
              marketplace.
            </p>
          </div>
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
