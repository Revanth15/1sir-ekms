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

const BarcodeScanner = () => {
  const [result, setResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<BrowserBarcodeReader | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [action, setAction] = useState<'sign-in' | 'sign-out'>('sign-in');
  const [rfid, setRfid] = useState('');

  const startScan = async () => {
    const reader = new BrowserBarcodeReader();
    try {
      const devices = await reader.listVideoInputDevices();
      console.log("Available video input devices:", devices);
      if (devices.length > 0) {
        setScanner(reader);
        setScanning(true);
      } else {
        console.error("No camera found");
      }
    } catch (error) {
      console.error("Error listing video devices:", error);
    }
  };

  const handleKeySelection = (keyId: string) => {
    setSelectedKeyId(keyId);
  };

  useEffect(() => {
    let active = true;
    const nricRegex = /^[STFG]\d{7}[A-Z]$/; // Regex for Singapore NRIC
  
    if (scanning && scanner) {
      const decode = async () => {
        try {
          const devices = await scanner.listVideoInputDevices();
          if (devices.length > 0) {
            const res = await scanner.decodeFromInputVideoDevice(devices[0].deviceId, 'video');
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
          } else {
            console.error("No camera found when trying to decode.");
            setScanning(false);
            setScanner(null);
          }
        } catch (err: any) {
          if (active) {
            console.error('Barcode decoding error:', err);
            if (err?.name === 'OverconstrainedError' && err?.constraint === 'deviceId') {
              console.error("The selected camera device is invalid or unavailable.");
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
  }, [scanner, scanning]);

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
        <Button onClick={startScan} disabled={scanning} className="mt-4">
          {scanning ? 'Scanning...' : 'Start Scan'}
        </Button>
        { scanning && (
            <div>
                <p className='text-xs'>*Make sure there is plenty of light</p>
                <div className="relative overflow-hidden rounded-md border">
                    <video id="video" className="w-full aspect-video" style={{ objectFit: 'cover' }}></video>
                </div>
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
            <div>
                <Select onValueChange={(value) => setAction(value as 'sign-in' | 'sign-out')} value={action}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sign-in">Sign Key In</SelectItem>
                        <SelectItem value="sign-out">Sign Key Out</SelectItem>
                    </SelectContent>
                </Select>

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