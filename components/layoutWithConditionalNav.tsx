"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/nav";
import { ReactNode } from "react";

interface LayoutWithConditionalNavProps {
  children: ReactNode;
}

export default function LayoutWithConditionalNav({ children }: LayoutWithConditionalNavProps) {
  const pathname = usePathname();
  const specificRoute = "/sca";

  return (
    <>
        <div className="bg-neutral-800 text-white">
            {pathname !== specificRoute && <Navigation />}
            {children}
        </div>
    </>
  );
}