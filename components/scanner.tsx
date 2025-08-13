'use client';
import React, { useState, useEffect } from 'react';
import { BrowserBarcodeReader, Result } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
// import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
// import { Key } from '@/interfaces/interfaces';
// import { addLogEntry } from '@/lib/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from '@/lib/utils';

interface VideoInputDevice {
  deviceId: string;
  label: string;
  kind: string;
}

const BarcodeScanner = () => {
  const [result, setResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<BrowserBarcodeReader | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');
  const [rfid, setRfid] = useState('');
  const [videoDevices, setVideoDevices] = useState<VideoInputDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Get available cameras on component mount
  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        const reader = new BrowserBarcodeReader();
        const devices = await reader.listVideoInputDevices();
        console.log("Available video input devices:", devices);
        
        const videoInputs = devices.map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));
        
        setVideoDevices(videoInputs);
        
        // Auto-select the first camera or prefer back camera
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
        toast.error("Failed to get camera list. Please check camera permissions.");
      }
    };

    getVideoDevices();
  }, []);

  const startScan = async () => {
    if (!selectedCameraId) {
      toast.error("Please select a camera first");
      return;
    }

    const reader = new BrowserBarcodeReader();
    try {
      setScanner(reader);
      setScanning(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Failed to start scanner");
    }
  };

  const handleKeySelection = (keyId: string) => {
    setSelectedKeyId(keyId);
  };

  const handleCameraSelection = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    
    // If currently scanning, restart with new camera jekkkkk
    if (scanning && scanner) {
      stopScan();
      // Small delay to ensure cleanup before restarting
      setTimeout(() => {
        startScan();
      }, 100);
    }
  };

  useEffect(() => {
    let active = true;
    const nricRegex = /^[STFG]\d{7}[A-Z]$/; // Regex for Singapore NRIC
  
    if (scanning && scanner && selectedCameraId) {
      const decode = async () => {
        try {
          const res = await scanner.decodeFromInputVideoDevice(selectedCameraId, 'video');
          if (active && res?.getText()) {
            const scannedText = res.getText();
            if (nricRegex.test(scannedText)) {
              setResult(scannedText);
              setScanning(false);
              scanner.reset();
              setScanner(null);
            } else {
              console.warn("Scanned result does not match Singapore NRIC format:", scannedText);
              toast.warning("Scanned barcode is not a valid NRIC")
              setScanning(false);
              scanner.reset();
              setScanner(null);
            }
          }
        } catch (err: any) {
          if (active) {
            console.error('Barcode decoding error:', err);
            if (err?.name === 'OverconstrainedError' && err?.constraint === 'deviceId') {
              console.error("The selected camera device is invalid or unavailable.");
              toast.error("Selected camera is not available. Please choose another camera.");
            } else if (err?.name === 'NotAllowedError') {
              toast.error("Camera access denied. Please allow camera permissions.");
            } else if (err?.name === 'NotFoundError') {
              toast.error("No camera found. Please connect a camera and try again.");
            }
            setScanning(false);
            setScanner(null);
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
  }, [scanner, scanning, selectedCameraId]);

  function maskNRIC(nric: string): string {
    if (nric.length < 4) return '*****';
    return '*****' + nric.slice(-4);
  }

  const stopScan = () => {
    setScanning(false);
    if (scanner) {
      scanner.reset();
      setScanner(null);
    }
  };

  const scanAgain = () => {
    setResult(null);
    setRfid('');
    setSelectedKeyId("");
    startScan();
  };

  return (
    <Card className={cn(
      "w-[350px] sm:w-[450px] md:w-[450px] lg:w-[450px] xl:w-[450px]",
      "max-w-[90%]"
    )}>
      <CardContent className="flex flex-col space-y-4">
        {/* Camera Selection */}
        {videoDevices.length > 0 && (
          <div className="mt-4">
            <Label htmlFor="camera-select">Select Camera</Label>
            <Select 
              onValueChange={handleCameraSelection} 
              value={selectedCameraId}
              disabled={scanning}
            >
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

        <Button 
          onClick={startScan} 
          disabled={scanning || !selectedCameraId} 
          className="mt-4"
        >
          {scanning ? 'Scanning...' : 'Start Scan'}
        </Button>

        {scanning && (
          <div>
            <p className='text-xs'>*Make sure there is plenty of light</p>
            <div className="relative overflow-hidden rounded-md border">
              <video 
                id="video" 
                className="w-full aspect-video" 
                style={{ objectFit: 'cover' }}
              />
            </div>
            {/* Show current camera info */}
            <p className="text-xs text-muted-foreground mt-2">
              Using: {videoDevices.find(d => d.deviceId === selectedCameraId)?.label || 'Selected Camera'}
            </p>
          </div>
        )}

        {result && (
          <div className="rounded-md bg-muted p-4 space-y-2">
            <h4>Scan Result</h4>
            <p className="text-lg font-semibold">{result}</p>
            <Button onClick={scanAgain} variant="default">
              Scan Again
            </Button>
          </div>
        )}

        {!result && (
          <Button onClick={stopScan} disabled={!scanning} variant="outline">
            Stop Scan
          </Button>
        )}

        {result && (
          <div className="space-y-4">
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

            <div>
              <Label htmlFor="rfid">RFID Number</Label>
              <Input
                id="rfid"
                type="text"
                value={rfid}
                onChange={(e) => setRfid(e.target.value)}
                placeholder="Scan or enter RFID number"
                className="mt-1"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;