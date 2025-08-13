'use client';

import Scanner from "@/components/scanner";

export default function Home() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-neutral-800">
      <Scanner />
    </div>
  );
}