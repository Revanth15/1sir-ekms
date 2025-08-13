import Scanner from "@/components/scanner";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-neutral-800">
      <Scanner />
    </div>
  );
}
