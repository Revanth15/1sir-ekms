'use client';

import LoadingScreen from "@/components/loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type ScanbotSDK from "scanbot-web-sdk/ui";

export default function Home() {
  const router = useRouter()
  let ScanbotSdk: typeof ScanbotSDK;
  const [scanResult, setScanResult] = useState("");

  useEffect(() => {
    loadSDK();
  });

  async function loadSDK() {
    ScanbotSdk = (await import('scanbot-web-sdk/ui')).default;

    let licencekey = process.env.LICENCEKEY || ""
    await ScanbotSdk.initialize({
      licenseKey: licencekey,
      enginePath: "/wasm/",
    });
  }

  async function startBarcodeScanner() {
    const config = new ScanbotSdk.UI.Config.BarcodeScannerScreenConfiguration();
    const result = await ScanbotSdk.UI.createBarcodeScanner(config);

    if (result && result.items.length > 0) {
      setScanResult(result.items[0].barcode.text);
    }
  }

  // initialize the Scanbot Barcode SDK
  

  // useEffect(() => {
  //     router.push("/scan")
  // }, [router])

  return (
    <div className="bg-neutral-800 min-h-screen">
      {/* <LoadingScreen/> */}
      <button onClick={startBarcodeScanner}>Scan Barcodes</button>
      <p>{scanResult}</p>
    </div>
  );
}