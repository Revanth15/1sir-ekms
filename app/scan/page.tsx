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

  const handleScanSubmit = async (nric: string, itemBarcode: string, action: "sign-in" | "sign-out") => {
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
        timestamp: new Date(),
      })

      const newScan = {
        nric: maskNRIC(nric),
        itemBarcode,
        action,
        timestamp: new Date(),
      }
      setRecentScans((prev) => [newScan, ...prev.slice(0, 9)])

      toast.success(`Key ${action === "sign-in" ? "signed in" : "signed out"} successfully!`)
    } catch (error) {
      console.error("Error updating barcode:", error)
      toast.error("Failed to update barcode. Please try again.")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 min-h-screen bg-neutral-800">
      {/* <div className="text-center">
        <h1 className="text-3xl font-bold">Barcode Scanner</h1>
        <p className="text-muted-foreground mt-2">Scan NRIC and key barcodes to sign keys in/out</p>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div>
          <BarcodeScanner onSubmit={handleScanSubmit} />
        </div>

        {/* Recent Scans Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent scans</p>
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm">{scan.itemBarcode}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          scan.action === "sign-out" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {scan.action === "sign-out" ? "OUT" : "IN"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">NRIC: {scan.nric}</div>
                    <div className="text-xs text-muted-foreground">{scan.timestamp.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
