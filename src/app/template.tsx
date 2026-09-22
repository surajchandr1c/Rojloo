import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-enter min-w-0 w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
