import type { ReactNode } from "react";
import NavBar from "@/components/navbar";
import Footer from "@/components/footer";
import AgeGate from "@/components/age-gate";
import { Providers } from "../providers";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-full flex-col">
        <NavBar />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <AgeGate />
    </Providers>
  );
}
