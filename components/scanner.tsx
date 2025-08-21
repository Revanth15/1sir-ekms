'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import type ScanbotSDK from "scanbot-web-sdk/ui";
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import RankCombobox from './rank-dropdown';

interface BarcodeScannerProps {
  onSubmit: (nric: string, itemBarcode: string, action: "sign-in" | "sign-out", rank: string, name: string, number: string) => void
}

const BarcodeScanner = ({ onSubmit }: BarcodeScannerProps) => {
  const [nricResult, setNricResult] = useState<string | null>(null);
  const [itemBarcode, setItemBarcode] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<'nric' | 'item'>('nric');
  // const [scanStep, setScanStep] = useState<'nric' | 'item' | 'reset'>('nric');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');
  let ScanbotSdkLocal: typeof ScanbotSDK;

  const [phone, setPhone] = useState('');
  const [rank, setRank] = useState('');
  const [name, setName] = useState('');
  const [rememberDetails, setRememberDetails] = useState(false);

  useEffect(() => {
    loadSDK();
  });

  useEffect(() => {
    const savedPhone = localStorage.getItem("scanner_phone");
    const savedRank = localStorage.getItem("scanner_rank");
    const savedName = localStorage.getItem("scanner_name");

    if (savedPhone) setPhone(savedPhone);
    if (savedRank) setRank(savedRank);
    if (savedName) setName(savedName);
  }, []);

  async function loadSDK() {
    ScanbotSdkLocal = (await import('scanbot-web-sdk/ui')).default;
    console.log("RESET") 
    let licencekey = process.env.LICENCEKEY || ""
    await ScanbotSdkLocal.initialize({
      licenseKey: licencekey,
      enginePath: "/wasm/",
    });
  }

  async function startBarcodeScanner() {
    const config = new ScanbotSdkLocal.UI.Config.BarcodeScannerScreenConfiguration()
    const info = await ScanbotSdkLocal.cameras.load("FAST")
    console.log(info)
    ScanbotSdkLocal.cameras.getMainCamera("front")

    config.actionBar.flashButton
    
    const result = await ScanbotSdkLocal.UI.createBarcodeScanner(config);
    let active = true;
    const nricRegex = /^[STFG]\d{7}[A-Z]$/;

    // if (!result || result.items.length === 0) {
    //   // User cancelled
    //   onScannerCancel(); // <-- call your function here
    //   return;
    // }

    if (result && result.items.length > 0) {
      const scannedText = result.items[0].barcode.text;
      console.log(scanStep)
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
        setScanning(false);
        toast.success("Key barcode scanned successfully!");
      }
      // setScanResult(result.items[0].barcode.text);
    }
  }

  // function onScannerCancel() {
  //   setScanStep("reset")
  //   setNricResult(null);
  //   setItemBarcode(null);
  //   // additional logic here
  // }

  const reRunbarCodeScanner = async () => {
    const timer = setTimeout(() => {
      loadSDK();
      startBarcodeScanner();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }

  useEffect(() => {
    if (scanStep === 'nric' && !nricResult) {
      reRunbarCodeScanner()
    } else if (scanStep === 'item' && (!itemBarcode || nricResult)) {
      reRunbarCodeScanner()
    }
  }, [scanStep]);

  const startScan = async () => {
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    setScanning(true);
    // reRunbarCodeScanner();
  };
  
  const handleRescanNric = () => {
    setNricResult(null);
    setScanStep('nric');
    toast.info("Please scan the NRIC again.");
    // reRunbarCodeScanner();
  };

  const handleRescanItem = async () => {
    setItemBarcode(null);
    setScanStep('item');
    setScanning(true);
    reRunbarCodeScanner();
  };
  
  const handleReset = () => {
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    toast.info("Scan has been reset.");
  };

  const handleResetUserFields = () => {
    setPhone('');
    setRank('');
    setName('');
    toast.info("User details reset (localStorage unchanged).");
  };

  const handleSubmit = () => {
    if (nricResult && itemBarcode) {
      if (rememberDetails) {
        localStorage.setItem("scanner_phone", phone);
        localStorage.setItem("scanner_rank", rank);
        localStorage.setItem("scanner_name", name);
      }
      onSubmit(nricResult, itemBarcode, action, rank, name, phone);
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" />
            </div>
            <div>
              <Label htmlFor="rank">Rank</Label>
              <RankCombobox
                onRankSelect={setRank}
                selectedRank={rank}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" checked={rememberDetails} onCheckedChange={(v: any) => setRememberDetails(v)} />
              <Label htmlFor="remember">Remember my details</Label>
            </div>

            <Button onClick={handleResetUserFields} variant="secondary" className="w-full">
              Reset User Fields
            </Button>
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