'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
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
  const [reader, setReader] = useState<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<'nric' | 'item'>('nric');
  const [videoDevices, setVideoDevices] = useState<VideoInputDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

  // Initialize the reader
  useEffect(() => {
    const multiFormatReader = new BrowserMultiFormatReader();
    setReader(multiFormatReader);
    
    return () => {
      // Cleanup will be handled in stopScan
    };
  }, []);

  // Get available video devices
  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        if (!reader) return;
        
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const videoInputs = devices.map((device: any) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
        
        setVideoDevices(videoInputs);
        
        if (videoInputs.length > 0) {
          // Prioritize back camera for better barcode scanning
          const backCamera = videoInputs.find((device: any) =>
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
    
    if (reader) {
      getVideoDevices();
    }
  }, [reader]);

  const handleSuccessfulScan = (scannedText: string) => {
    const now = Date.now();
    
    // Prevent duplicate scans within 1 second
    if (now - lastScanTime < 1000) {
      return;
    }
    
    setLastScanTime(now);
    
    const nricRegex = /^[STFG]\d{7}[A-Z]$/;
    
    if (scanStep === 'nric') {
      if (nricRegex.test(scannedText)) {
        setNricResult(scannedText);
        setScanStep('item');
        toast.success("NRIC Scanned! Now scan the key barcode.", {
          duration: 2000,
        });
        // Continue scanning for the item barcode
      } else {
        toast.warning("Invalid NRIC format. Try again.", { duration: 1500 });
      }
    } else if (scanStep === 'item') {
      setItemBarcode(scannedText);
      stopScan();
      toast.success("🎉 Key barcode scanned! Ready to submit.", {
        duration: 3000,
      });
    }
  };

  const startScan = async () => {
    if (!reader || !selectedCameraId) {
      toast.error("Scanner not ready or no camera selected");
      return;
    }

    try {
      setNricResult(null);
      setItemBarcode(null);
      setScanStep('nric');
      setScanning(true);
      setIsScanning(true);

      // Enhanced video constraints for better barcode scanning
      const constraints = {
        video: {
          deviceId: selectedCameraId,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          facingMode: 'environment', // Prefer back camera
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };

      // Start continuous decoding with the new API
      controlsRef.current = await reader.decodeFromVideoDevice(
        selectedCameraId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            handleSuccessfulScan(result.getText());
          }
          // Silently ignore errors - they're normal during scanning
        }
      );
      
      toast.success("Scanner ready! Position barcode in view.", {
        duration: 2000,
      });
      
    } catch (error: any) {
      console.error("Error starting scan:", error);
      toast.error(`Failed to start camera: ${error.message || 'Check permissions'}`);
      setScanning(false);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    setScanning(false);
    setIsScanning(false);
    
    // Proper cleanup for ZXing scanner
    if (controlsRef.current) {
      try {
        // Stop the video stream
        controlsRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner controls:", error);
      }
      controlsRef.current = null;
    }

    // Stop any video stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCameraSelection = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scanning) {
      stopScan();
      setTimeout(() => startScan(), 300);
    }
  };

  const handleReset = () => {
    stopScan();
    setNricResult(null);
    setItemBarcode(null);
    setScanStep('nric');
    toast.info("Scanner reset. Ready for new scan.");
  };

  const handleSubmit = () => {
    if (nricResult && itemBarcode) {
      onSubmit(nricResult, itemBarcode, action);
      handleReset();
      toast.success("Submission complete!");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 space-y-4">
        {/* Camera Selection */}
        {!scanning && (
          <div className="space-y-2">
            <Label>Camera</Label>
            <Select onValueChange={handleCameraSelection} value={selectedCameraId}>
              <SelectTrigger>
                <SelectValue placeholder="Select camera" />
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

        {/* Scan Controls */}
        {!scanning && !nricResult && (
          <Button onClick={startScan} disabled={!selectedCameraId || !reader} className="w-full">
            {!reader ? 'Initializing Scanner...' : 'Start Enhanced Scan'}
          </Button>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {scanStep === 'nric' ? 'Scan NRIC Barcode' : 'Scan Key Barcode'}
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Scanning continuously...
              </div>
            </div>

            {/* Enhanced Video Preview */}
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-80 object-cover"
                playsInline
                muted
                autoPlay
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    {/* Main scanning frame */}
                    <div className="w-64 h-32 border-2 border-red-500 rounded-lg">
                      {/* Animated scanning line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 animate-bounce"></div>
                      {/* Corner indicators */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500"></div>
                    </div>
                    
                    {/* Instruction text */}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Align barcode within frame
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={stopScan} variant="destructive" className="w-full">
              Stop Scanning
            </Button>

            {nricResult && scanStep === 'item' && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-green-700">
                  ✅ NRIC: <span className="font-mono font-semibold">{nricResult}</span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Now scanning for key barcode...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {nricResult && !scanning && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-green-700">✅ Scan Results</h3>
            
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-gray-600">NRIC</Label>
                <div className="font-mono text-lg p-2 bg-white rounded border shadow-sm">
                  {nricResult}
                </div>
              </div>
              
              {itemBarcode && (
                <div>
                  <Label className="text-xs text-gray-600">Key Barcode</Label>
                  <div className="font-mono text-lg p-2 bg-white rounded border shadow-sm">
                    {itemBarcode}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                New Scan
              </Button>
              {!itemBarcode && (
                <Button onClick={startScan} className="flex-1">
                  Continue Scan
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Submit Form */}
        {nricResult && itemBarcode && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label>Action</Label>
              <Select onValueChange={(value) => setAction(value as 'sign-in' | 'sign-out')} value={action}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sign-in">Sign Key In</SelectItem>
                  <SelectItem value="sign-out">Sign Key Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSubmit} className="w-full bg-green-600 hover:bg-green-700">
              Submit {action === 'sign-in' ? 'Sign In' : 'Sign Out'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;