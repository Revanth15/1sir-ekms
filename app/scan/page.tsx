"use client"

import { useState } from "react"
import BarcodeScanner from "@/components/scanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { updateBarcodeTimestamp, getBarcodeByCode } from "@/lib/barcode-service"
import { logActivity, maskNRIC } from "@/lib/logging-service"

export default function ScannerPage() {
  const [recentScans, setRecentScans] = useState<
    Array<{
      nric: string
      itemBarcode: string
      action: "sign-in" | "sign-out"
      timestamp: Date
    }>
  >([])

  const handleScanSubmit = async (nric: string, itemBarcode: string, action: "sign-in" | "sign-out", rank: string, name: string, number: string) => {
    try {
      const barcodeData = await getBarcodeByCode(itemBarcode)
      if (!barcodeData) {
        toast.error("Barcode not found in system")
        return
      }

      await updateBarcodeTimestamp(itemBarcode, action)

      await logActivity({
        maskedNric: maskNRIC(nric),
        barcodeCode: itemBarcode,
        company: barcodeData.company,
        location: barcodeData.location,
        keyNo: barcodeData.keyNo,
        action,
        rank: rank,
        name: name,
        number: number,
        timestamp: new Date(),
      })

      // const newScan = {
      //   nric: maskNRIC(nric),
      //   itemBarcode,
      //   action,
      //   timestamp: new Date(),
      // }
      // setRecentScans((prev) => [newScan, ...prev.slice(0, 9)])

      toast.success(`Key ${action === "sign-in" ? "signed in" : "signed out"} successfully!`)
    } catch (error) {
      console.error("Error updating barcode:", error)
      toast.error("Failed to update barcode. Please try again.")
    }
  }

  return (
    <div className="h-screen bg-neutral-800 flex items-top justify-center pt-16">
      {/* Scanner Section */}
      <div>
        <BarcodeScanner onSubmit={handleScanSubmit} />
      </div>
    </div>
  )
}
