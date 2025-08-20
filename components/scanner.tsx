'use client';
import React, { useState, useEffect } from 'react';
import { BrowserBarcodeReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from './ui/label';
import { Slider } from '@/components/ui/slider';
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
  const [zoom, setZoom] = useState<number>(1);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

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

  // Apply zoom to video element
  useEffect(() => {
    if (videoElement && scanning) {
      videoElement.style.transform = `scale(${zoom})`;
    }
  }, [zoom, videoElement, scanning]);

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
    setZoom(1); // Reset zoom when starting new scan
    const reader = new BrowserBarcodeReader();
    setScanner(reader);
    setScanning(true);
    
    // Get video element reference after a short delay to ensure it's rendered
    setTimeout(() => {
      const video = document.getElementById('video') as HTMLVideoElement;
      setVideoElement(video);
    }, 100);
  };

  const stopScan = () => {
    if (scanner) {
      scanner.reset();
    }
    setScanning(false);
    setScanner(null);
    setVideoElement(null);
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
    
    // Get video element reference
    setTimeout(() => {
      const video = document.getElementById('video') as HTMLVideoElement;
      setVideoElement(video);
    }, 100);
  };
  
  const handleReset = () => {
    stopScan();
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    setZoom(1);
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
      "w-[400px] sm:w-[500px] md:w-[600px] lg:w-[650px] xl:w-[700px]",
      "max-w-[95%]"
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
          <div className="space-y-4">
            <p className='text-sm font-medium text-center'>
              {scanStep === 'nric' ? 'Scan NRIC Barcode' : 'Scan Key Barcode'}
            </p>
            
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Zoom: {zoom.toFixed(1)}x</Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    disabled={zoom <= 0.5}
                  >
                    -
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    disabled={zoom >= 3}
                  >
                    +
                  </Button>
                </div>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value: React.SetStateAction<number>[]) => setZoom(value[0])}
                max={3}
                min={0.5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Enhanced Video Preview */}
            <div className="relative overflow-hidden rounded-lg border-2 border-primary/20">
              <div className="relative bg-black" style={{ height: '400px' }}>
                <video 
                  id="video" 
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{ 
                    objectFit: 'cover',
                    transformOrigin: 'center center'
                  }} 
                />
                
                {/* Scanning overlay with target area */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Scanning frame */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-64 h-32 border-2 border-green-400 rounded-lg shadow-lg">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                    </div>
                  </div>
                  
                  {/* Instructions overlay */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    Position barcode within the green frame
                  </div>
                </div>
              </div>
            </div>

            {nricResult && scanStep === 'item' && (
              <div className='flex flex-col items-center space-y-2 p-3 bg-muted rounded-lg'>
                <p className="text-sm text-muted-foreground">✅ NRIC Scanned: {nricResult}</p>
                <Button onClick={handleRescanNric} variant="outline" size="sm">
                  Scan NRIC Again
                </Button>
              </div> 
            )}
          </div>
        )}

        {/* --- RESULTS DISPLAY & POST-SCAN ACTIONS --- */}
        {nricResult && !scanning && (
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h4 className='font-semibold text-green-700'>✅ Scan Complete</h4>
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">NRIC</Label>
                <p className="text-lg font-mono bg-white p-2 rounded border">{nricResult}</p>
              </div>
              {itemBarcode && (
                <div>
                  <Label className="text-sm font-medium">Key Barcode</Label>
                  <p className="text-lg font-mono bg-white p-2 rounded border">{itemBarcode}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2 pt-3 border-t">
              <Button onClick={startScan} variant="outline">Start New Scan (Reset All)</Button>
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
            <Button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-700">
              Submit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;