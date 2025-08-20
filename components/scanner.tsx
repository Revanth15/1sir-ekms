'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [scanAttempts, setScanAttempts] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Aggressive scanning configuration
  const SCAN_INTERVAL = 100; // Scan every 100ms instead of continuous
  const SCAN_TIMEOUT = 50; // Quick timeout for failed attempts
  const MAX_SCAN_ATTEMPTS = 3; // Auto-retry failed scans

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
          // Prioritize back camera for better barcode scanning
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

  // High-performance continuous scanning like Scanbot
  const continuousScan = useCallback(async () => {
    if (!scanner || !videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(continuousScan);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data from canvas for faster processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert ImageData to HTMLImageElement for ZXing
      const imageCanvas = document.createElement('canvas');
      imageCanvas.width = canvas.width;
      imageCanvas.height = canvas.height;
      const imageCtx = imageCanvas.getContext('2d');
      if (imageCtx) {
        imageCtx.putImageData(imageData, 0, 0);
        const result = await scanner.decodeFromImage(undefined, imageCanvas.toDataURL());
        
        if (result?.getText()) {
          const scannedText = result.getText();
          const now = Date.now();
          
          // Prevent duplicate scans within 1 second
          if (now - lastScanTime < 1000) {
            animationFrameRef.current = requestAnimationFrame(continuousScan);
            return;
          }
          
          setLastScanTime(now);
          handleSuccessfulScan(scannedText);
          return;
        }
      }
    } catch (err: any) {
      // Silently continue on failed scans - this is normal
      setScanAttempts(prev => prev + 1);
    }

    // Continue scanning at high frequency
    setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(continuousScan);
    }, SCAN_INTERVAL);
  }, [scanner, scanning, lastScanTime, scanStep]);

  const handleSuccessfulScan = (scannedText: string) => {
    const nricRegex = /^[STFG]\d{7}[A-Z]$/;
    
    if (scanStep === 'nric') {
      if (nricRegex.test(scannedText)) {
        setNricResult(scannedText);
        setScanStep('item');
        setScanAttempts(0);
        toast.success("NRIC Scanned! Now scan the key barcode.", {
          duration: 2000,
        });
        // Brief pause before continuing to item scan
        setTimeout(() => {
          if (scanning) {
            animationFrameRef.current = requestAnimationFrame(continuousScan);
          }
        }, 500);
      } else {
        toast.warning("Invalid NRIC format. Try again.", { duration: 1500 });
        setTimeout(() => {
          if (scanning) {
            animationFrameRef.current = requestAnimationFrame(continuousScan);
          }
        }, 100);
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
    if (!selectedCameraId) {
      toast.error("Please select a camera first");
      return;
    }

    try {
      // Clean up any existing resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setNricResult(null);
      setItemBarcode(null);
      setScanStep('nric');
      setScanAttempts(0);
      setScanning(true);

      // Get high-quality video stream with optimal settings for barcode scanning
      const constraints = {
        video: {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          focusMode: { ideal: 'continuous' },
          torch: false, // Disable torch initially
          zoom: { ideal: 1.0 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
      }

      // Initialize high-performance scanner
      const reader = new BrowserBarcodeReader();
      setScanner(reader);
      
      // Start continuous scanning immediately
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(continuousScan);
      }, 100);
      
      toast.success("Scanner ready! Position barcode in view.", {
        duration: 2000,
      });
      
    } catch (error) {
      console.error("Error starting scan:", error);
      toast.error("Failed to start camera. Check permissions.");
      setScanning(false);
    }
  };

  const stopScan = () => {
    setScanning(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (scanner) {
      scanner.reset();
    }
    
    setScanner(null);
    setScanAttempts(0);
  };

  const handleCameraSelection = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (scanning) {
      stopScan();
      setTimeout(() => startScan(), 200);
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
          <Button onClick={startScan} disabled={!selectedCameraId} className="w-full">
            Start High-Speed Scan
          </Button>
        )}

        {scanning && (
          <div className="space-y-3">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                {scanStep === 'nric' ? 'Scan NRIC Barcode' : 'Scan Key Barcode'}
              </div>
              <div className="text-sm text-muted-foreground">
                Scanning... {scanAttempts > 0 && `(${scanAttempts} attempts)`}
              </div>
            </div>

            {/* High-Performance Video Preview */}
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-80 object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Minimal scanning indicator */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-24 border-2 border-red-500 rounded animate-pulse">
                    {/* Just corner indicators - no visual clutter */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-red-500"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-red-500"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-red-500"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-red-500"></div>
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
                  ✅ NRIC: <span className="font-mono">{nricResult}</span>
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
                <Label className="text-xs">NRIC</Label>
                <div className="font-mono text-lg p-2 bg-white rounded border">
                  {nricResult}
                </div>
              </div>
              
              {itemBarcode && (
                <div>
                  <Label className="text-xs">Key Barcode</Label>
                  <div className="font-mono text-lg p-2 bg-white rounded border">
                    {itemBarcode}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={startScan} variant="outline" className="flex-1">
                New Scan
              </Button>
              {!itemBarcode && (
                <Button onClick={startScan} className="flex-1">
                  Continue
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
              Submit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;