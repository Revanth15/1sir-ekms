"use client";

import { useState } from "react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function BarcodesPage() {
  const [company, setCompany] = useState("SP");
  const [location, setLocation] = useState("");
  const [keyNo, setKeyNo] = useState("");

  const companies = [
    { label: "ALPHA", value: "A" },
    { label: "BRAVO", value: "B" },
    { label: "CHARLIE", value: "C" },
    { label: "SUPPORT", value: "SP" },
    { label: "HQ", value: "HQ" },
  ];

  const barcodeValue =
    company && location && keyNo ? `${company}-${location}-${keyNo}` : "";

  const handlePrint = () => {
    const printContent = document.getElementById("barcode-print");
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent?.outerHTML ?? "";
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="flex justify-center items-start p-6 h-screen bg-neutral-800">
      <div className="space-y-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-white">Barcode Generator</h1>

        {/* Form Card */}
        <Card className="w-full">
          <CardContent className="flex flex-row gap-4 items-end">
            {/* Company */}
            <div className="flex flex-col">
              <Label>Company</Label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="flex flex-col">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="e.g. OFC"
                className="w-24"
              />
            </div>

            {/* Key No */}
            <div className="flex flex-col">
              <Label>Key No</Label>
              <Input
                type="number"
                value={keyNo}
                onChange={(e) => setKeyNo(e.target.value)}
                min={0}
                max={999}
                placeholder="e.g. 02"
                className="w-25"
              />
            </div>
          </CardContent>
        </Card>

        {/* Barcode Display */}
        {barcodeValue ? (
          <div className="mt-6 text-center space-y-4">
            <div id="barcode-print" className="inline-block">
              <Barcode
                value={barcodeValue}
                format="CODE128"
                width={1.5}
                height={30}
                displayValue={true}
                fontSize={12}
                renderer="svg"
              />
            </div>
            <Button onClick={handlePrint}>Print Barcode</Button>
          </div>
        ) : (
          <p className="text-gray-500 text-center">
            Fill in all fields to generate a barcode.
          </p>
        )}
      </div>
    </div>
  );
}
