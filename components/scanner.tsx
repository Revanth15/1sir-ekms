'use client';
import React, { useState, useEffect } from 'react';
import { BrowserBarcodeReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

interface VideoInputDevice {
  deviceId: string;
  label: string;
  kind: string;
}
interface BarcodeScannerProps {
  onSubmit: (nric: string, itemBarcode: string, action: "sign-in" | "sign-out") => void
}

const BarcodeScanner = ({ onSubmit }: BarcodeScannerProps) => {
  const [nricResult, setNricResult] = useState<string | null>(null);
  const [itemBarcode, setItemBarcode] = useState<string | null>(null);
  const [scanner, setScanner] = useState<BrowserBarcodeReader | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<'nric' | 'item'>('nric');
  const [videoDevices, setVideoDevices] = useState<VideoInputDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');


  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        const reader = new BrowserBarcodeReader();
        const devices = await reader.listVideoInputDevices();
        const videoInputs = devices.map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          const backCamera = videoInputs.find(device =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCamera ? backCamera.deviceId : videoInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error listing video devices:", error);
        toast.error("Failed to get camera list. Please check permissions.");
      }
    };
    getVideoDevices();
  }, []);

  useEffect(() => {
    let active = true;
    const nricRegex = /^[STFG]\d{7}[A-Z]$/;

    if (scanning && scanner && selectedCameraId) {
      const decode = async () => {
        try {
          const res = await scanner.decodeFromInputVideoDevice(selectedCameraId, 'video');
          if (active && res?.getText()) {
            const scannedText = res.getText();
            
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
              stopScan();
              toast.success("Key barcode scanned successfully!");
            }
          }
        } catch (err: any) {
          if (active && err?.name !== 'NotFoundException') {
            console.error('Barcode decoding error:', err);
            stopScan();
          }
        }
      };
      decode();
    }

    return () => {
      active = false;
      if (scanner) {
        scanner.reset();
      }
    };
  }, [scanner, scanning, selectedCameraId, scanStep]);

  const startScan = async () => {
    if (!selectedCameraId) {
      toast.error("Please select a camera first");
      return;
    }
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    const reader = new BrowserBarcodeReader();
    setScanner(reader);
    setScanning(true);
  };

  const stopScan = () => {
    if (scanner) {
      scanner.reset();
    }
    setScanning(false);
    setScanner(null);
  };
  
  const handleCameraSelection = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scanning) {
      stopScan();
      setTimeout(() => startScan(), 100);
    }
  };

  const handleRescanNric = () => {
    setNricResult(null);
    setScanStep('nric');
    toast.info("Please scan the NRIC again.");
  };

  const handleRescanItem = async () => {
    if (!selectedCameraId) { toast.error("Camera not selected."); return; }
    setItemBarcode(null);
    const reader = new BrowserBarcodeReader();
    setScanner(reader);
    setScanStep('item');
    setScanning(true);
  };
  
  const handleReset = () => {
    stopScan();
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
        {/* Camera Selection */}
        {!scanning && (
          <div>
            <Label htmlFor="camera-select">Select Camera</Label>
            <Select onValueChange={handleCameraSelection} value={selectedCameraId} disabled={scanning}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Choose a camera" />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* --- Main Action Buttons --- */}
        {!nricResult && !scanning && (
          <Button onClick={startScan} disabled={!selectedCameraId}>
            Start Scan
          </Button>
        )}
        {scanning && (
          <Button onClick={stopScan} variant="outline">
            Stop Scan
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