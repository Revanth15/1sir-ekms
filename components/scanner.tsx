'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import ScanbotSDK from "scanbot-web-sdk/ui";

interface BarcodeScannerProps {
  onSubmit: (nric: string, itemBarcode: string, action: "sign-in" | "sign-out") => void
}

const BarcodeScanner = ({ onSubmit }: BarcodeScannerProps) => {
  const [nricResult, setNricResult] = useState<string | null>(null);
  const [itemBarcode, setItemBarcode] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<'nric' | 'item'>('nric');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');
  let ScanbotSdk: typeof ScanbotSDK;


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
    const config = new ScanbotSdk.UI.Config.BarcodeScannerScreenConfiguration()
    const info = await ScanbotSDK.cameras.load("FAST")
    console.log(info)
    ScanbotSDK.cameras.getMainCamera("front")

    config.actionBar.flashButton
    
    const result = await ScanbotSdk.UI.createBarcodeScanner(config);
    let active = true;
    const nricRegex = /^[STFG]\d{7}[A-Z]$/;

    if (result && result.items.length > 0) {
      const scannedText = result.items[0].barcode.text;

      if (scanStep === 'nric') {
        if (nricRegex.test(scannedText)) {
          setNricResult(scannedText);
          setScanStep('item');
          toast.success("NRIC Scanned. Now scan the Key Barcode.");
        } else {
          toast.warning("Not a valid NRIC. Please try again.");
        }
      } else if (scanStep === 'item') {
        setItemBarcode(scannedText);
        toast.success("Key barcode scanned successfully!");
      }
      // setScanResult(result.items[0].barcode.text);
    }
  }

  useEffect(() => {
    startBarcodeScanner()
  }, [scanning, selectedCameraId, scanStep]);

  const startScan = async () => {
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    setScanning(true);
    startBarcodeScanner();
  };
  
  const handleRescanNric = () => {
    setNricResult(null);
    setScanStep('nric');
    toast.info("Please scan the NRIC again.");
  };

  const handleRescanItem = async () => {
    // if (!selectedCameraId) { toast.error("Camera not selected."); return; }
    setItemBarcode(null);
    setScanStep('item');
    setScanning(true);
  };
  
  const handleReset = () => {
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    toast.info("Scan has been reset.");
  };

  const handleSubmit = () => {
    if (nricResult && itemBarcode) {
      onSubmit(nricResult, itemBarcode, action)
      // Reset scanner after submit
      handleReset()
    }
  }

  return (
    <Card className={cn(
      "w-[350px] sm:w-[450px] md:w-[450px] lg:w-[450px] xl:w-[450px]",
      "max-w-[90%]"
    )}>
      <CardContent className="flex flex-col space-y-4 pt-6">

        {/* --- Main Action Buttons --- */}
        {!nricResult && !scanning && (
          <Button onClick={startScan}>
            Start Scan
          </Button>
        )}
        {nricResult && !itemBarcode && (
          <Button onClick={handleReset} variant="destructive" className="w-full">
            Reset All
          </Button>
        )}

        {/* --- SCANNING UI --- */}
        {scanning && (
          <div>
            <p className='text-sm font-medium text-center mb-2'>
              {scanStep === 'nric' ? 'Scan NRIC Barcode' : 'Scan Key Barcode'}
            </p>
            <div className="relative overflow-hidden rounded-md border">
              <video id="video" className="w-full aspect-video" style={{ objectFit: 'cover' }} />
            </div>
            {nricResult && scanStep === 'item' && (
              <div className='flex flex-col items-center mt-2'>
                <p className="text-xs text-muted-foreground">Scanned NRIC: {nricResult}</p>
                <Button onClick={handleRescanNric} className="h-auto p-1 text-xs">
                  Scan NRIC Again
                </Button>
              </div> 
            )}
          </div>
        )}

        {/* --- RESULTS DISPLAY & POST-SCAN ACTIONS --- */}
        {nricResult && !scanning && (
          <div className="rounded-md bg-muted p-4 space-y-3">
            <h4 className='font-semibold'>Scan Complete</h4>
            <div>
              <Label>NRIC</Label>
              <p className="text-lg font-mono">{nricResult}</p>
            </div>
            {itemBarcode && (
              <div>
                <Label>Key Barcode</Label>
                <p className="text-lg font-mono">{itemBarcode}</p>
              </div>
            )}
            <div className="flex flex-col space-y-2 pt-2 border-t">
              <Button onClick={startScan}>Start New Scan (Reset All)</Button>
              <Button onClick={handleRescanItem} variant="outline">Scan Item Again</Button>
            </div>
          </div>
        )}
        
        {/* --- FINAL SUBMIT FORM --- */}
        {nricResult && itemBarcode && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label htmlFor="action-select">Action</Label>
              <Select onValueChange={(value) => setAction(value as 'sign-in' | 'sign-out')} value={action}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sign-in">Sign Key In</SelectItem>
                  <SelectItem value="sign-out">Sign Key Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Submit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;