'use client';

import LoadingScreen from "@/components/loading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter()

  useEffect(() => {
      router.push("/scan")
  }, [router])

  return (
    <div className="bg-neutral-800 min-h-screen">
      <LoadingScreen/>
    </div>
  );
}