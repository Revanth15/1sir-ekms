"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Navigation() {
  const router = useRouter();
  const [wings, setWings] = useState<string[]>([]);
  const [selectedWing, setSelectedWing] = useState<string>();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  

  const HamburgerIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16m-7 6h7"
      />
    </svg>
  );
  
  const CloseIcon = () => (
      <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
      >
          <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12" 
          />
      </svg>
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when a link is clicked
  const handleLinkClick = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };


  return (
    <nav className="bg-neutral-900 text-white p-4 mb-8 rounded-2xl mt-0 mx-2">
      <div className="container mx-auto flex flex-wrap lg:flex-nowrap justify-between items-center">

        <Link href="/" className="text-2xl font-bold" onClick={handleLinkClick}>
          1SIR EKMS
        </Link>

        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-md lg:hidden text-neutral-300 hover:text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white ml-3" // Added ml-3
          aria-controls="mobile-menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="sr-only">Open main menu</span>
          {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
        <div
            className={`w-full lg:flex lg:items-center lg:w-auto ${
                isMobileMenuOpen ? 'block' : 'hidden' 
            }`}
            id="mobile-menu"
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full space-y-4 lg:space-y-0 mt-4 lg:mt-0 lg:ml-8">
                <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 ml-4">
                    <Link href="/dashboard" onClick={handleLinkClick}>
                        <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} className={`w-full justify-start lg:w-auto ${pathname !== "/dashboard" ? "text-neutral-300 hover:bg-neutral-700 hover:text-white" : ""}`}>
                        Dashboard
                        </Button>
                    </Link>
                    <Link href="/register-key" onClick={handleLinkClick}>
                        <Button variant={pathname === "/register-key" ? "secondary" : "ghost"} className={`w-full justify-start lg:w-auto ${pathname !== "/register-key" ? "text-neutral-300 hover:bg-neutral-700 hover:text-white" : ""}`}>
                        Register Keys
                        </Button>
                    </Link>
                    {/* <Link href="/sign-in-out" onClick={handleLinkClick}>
                        <Button variant={pathname === "/sign-in-out" ? "secondary" : "ghost"} className={`w-full justify-start lg:w-auto ${pathname !== "/sign-in-out" ? "text-neutral-300 hover:bg-neutral-700 hover:text-white" : ""}`}>
                        Sign In/Out Keys
                        </Button>
                    </Link> */}
                    {/* <Button onClick={() => { handleSignOut(); handleLinkClick(); }} variant="destructive" className="w-full justify-start lg:w-auto">
                        Log Out
                    </Button> */}
                </div>
            </div>
        </div>

      </div>
    </nav>
  );
}