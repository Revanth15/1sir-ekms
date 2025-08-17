"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Filter, Printer } from "lucide-react"
import Barcode from "react-barcode"
import { saveBarcodeToFirebase, loadBarcodesFromFirebase, deleteBarcodeFromFirebase } from "@/lib/barcode-service"
import { toast } from "sonner"

interface SavedBarcode {
  id: string
  company: string
  location: string
  keyNo: string
  barcodeCode: string
  noOfKeys: string
  createdAt: any
  lastUpdate?: Date
  lastReturn?: Date
  lastDraw?: Date
}

export default function Home() {
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [keyNo, setKeyNo] = useState("")
  const [noOfKeys, setNoOfKeys] = useState("")
  const [savedBarcodes, setSavedBarcodes] = useState<SavedBarcode[]>([])
  const [filteredBarcodes, setFilteredBarcodes] = useState<SavedBarcode[]>([])
  const [filterCompany, setFilterCompany] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSavedBarcodes()
  }, [])

  useEffect(() => {
    if (filterCompany === "all") {
      setFilteredBarcodes(savedBarcodes)
    } else {
      setFilteredBarcodes(savedBarcodes.filter((barcode) => barcode.company === filterCompany))
    }
  }, [savedBarcodes, filterCompany])

  const loadSavedBarcodes = async () => {
    try {
      const barcodes = await loadBarcodesFromFirebase()
      setSavedBarcodes(barcodes)
    } catch (error) {
      console.error("Failed to load barcodes:", error)
    }
  }

  const handleAddBarcode = async () => {
    if (!company || !location || !keyNo || !noOfKeys) return

    setIsLoading(true)
    try {
      const formattedKeyNo = keyNo.padStart(2, "0")
      const barcodeCode = `${company}-${location.toUpperCase()}-${formattedKeyNo}`

      const barcodeData: any = {
        company,
        location: location.toUpperCase(),
        keyNo: formattedKeyNo,
        barcodeCode,
        noOfKeys,
      }

      await saveBarcodeToFirebase(barcodeData)

      setCompany("")
      setLocation("")
      setKeyNo("")
      setNoOfKeys("")
      await loadSavedBarcodes()
      toast.success("Barcode added successfully!")
    } catch (error) {
      console.error("Failed to save barcode:", error)
      toast.error("Failed to save barcode")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteBarcode = async (id: string) => {
    try {
      await deleteBarcodeFromFirebase(id)
      await loadSavedBarcodes()
      setSelectedBarcodes((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    } catch (error) {
      console.error("Failed to delete barcode:", error)
    }
  }

  const toggleBarcodeSelection = (id: string, fromCheckbox = false) => {
    setSelectedBarcodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedBarcodes.size === filteredBarcodes.length) {
      setSelectedBarcodes(new Set())
    } else {
      setSelectedBarcodes(new Set(filteredBarcodes.map((b) => b.id)))
    }
  }

  const printSelectedBarcodes = () => {
    const barcodesToPrint = filteredBarcodes.filter((b) => selectedBarcodes.has(b.id))
    if (barcodesToPrint.length === 0) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const barcodeHtml = barcodesToPrint
      .map(
        (barcode) => `
      <div class="barcode-container">
        <svg class="barcode-svg" data-code="${barcode.barcodeCode}"></svg>
        <div class="barcode-label">${barcode.barcodeCode}</div>
        <div class="barcode-keys">No of keys: ${barcode.noOfKeys}</div>
      </div>
    `,
      )
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @media print {
              @page { 
                margin: 10mm; 
                size: A4;
              }
              body { 
                margin: 0; 
                font-family: monospace; 
                -webkit-print-color-adjust: exact;
              }
            }
            .print-container {
              display: grid;
              grid-template-columns: repeat(4, 40mm);
              gap: 5mm;
              justify-content: center;
              max-width: 210mm;
              margin: 0 auto;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 40mm;
              height: 25mm;
              page-break-inside: avoid;
              margin-bottom: 3mm;
            }
            .barcode-svg {
              width: 40mm !important;
              height: 20mm !important;
            }
            .barcode-label, .barcode-keys {
              font-size: 7px;
              margin-top: 0.2mm;
              text-align: center;
              font-family: monospace;
              line-height: 1;
              width: 40mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${barcodeHtml}
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            document.querySelectorAll('.barcode-svg').forEach(svg => {
              JsBarcode(svg, svg.dataset.code, {
                format: "CODE128",
                width: 1.2,
                height: 50,
                displayValue: false,
                margin: 0
              });
            });
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `)
  }

  const formattedKeyNo = keyNo ? keyNo.padStart(2, "0") : ""
  const barcodeData = company && location && keyNo ? `${company}-${location.toUpperCase()}-${formattedKeyNo}` : ""
  const uniqueCompanies = Array.from(new Set(savedBarcodes.map((b) => b.company)))

  return (
    <div className="min-h-screen bg-neutral-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Add New Barcode</CardTitle>
                <CardDescription>Enter details to generate and save a barcode</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Select value={company} onValueChange={setCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SP">SP</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location (max 8 chars)</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value.toUpperCase().slice(0, 8))}
                      placeholder="Enter location"
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keyNo">Key Number (0-999)</Label>
                    <Input
                      id="keyNo"
                      type="number"
                      value={keyNo}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value) || 0
                        if (value >= 0 && value <= 999) {
                          setKeyNo(e.target.value)
                        }
                      }}
                      placeholder="Enter key number"
                      min="0"
                      max="999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noOfKeys">No of Keys</Label>
                    <Input
                      id="noOfKeys"
                      value={noOfKeys}
                      onChange={(e) => setNoOfKeys(e.target.value.toUpperCase())}
                      placeholder="Enter number of keys"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddBarcode}
                  disabled={!company || !location || !keyNo || !noOfKeys || isLoading}
                  className="w-full"
                >
                  {isLoading ? "Adding..." : "Add Barcode"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>Preview updates as you type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-2 min-h-[120px] justify-center">
                  {barcodeData ? (
                    <>
                      <div className="w-full max-w-[40mm] h-[20mm] flex items-center justify-center overflow-hidden">
                        <Barcode
                          value={barcodeData}
                          format="CODE128"
                          width={1.2}
                          height={50}
                          displayValue={false}
                          margin={0}
                        />
                      </div>
                      <p className="text-xs font-mono text-center break-all">{barcodeData}</p>
                      {noOfKeys && <p className="text-xs text-center">No of keys: {noOfKeys}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Start typing to see preview</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Print Barcodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="filter-company">Company:</Label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {uniqueCompanies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedBarcodes.size === filteredBarcodes.length ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  onClick={printSelectedBarcodes}
                  disabled={selectedBarcodes.size === 0}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Selected ({selectedBarcodes.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Barcodes ({filteredBarcodes.length})</CardTitle>
            <CardDescription>Click cards to select barcodes for printing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBarcodes.map((barcode) => (
                <div
                  key={barcode.id}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                    selectedBarcodes.has(barcode.id) ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleBarcodeSelection(barcode.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedBarcodes.has(barcode.id)}
                        onCheckedChange={() => toggleBarcodeSelection(barcode.id, true)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="text-sm text-muted-foreground">
                        {barcode.company} - {barcode.location}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteBarcode(barcode.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-full max-w-[35mm] h-[18mm] flex items-center justify-center overflow-hidden">
                      <Barcode
                        value={barcode.barcodeCode}
                        format="CODE128"
                        width={1}
                        height={45}
                        displayValue={false}
                        margin={0}
                      />
                    </div>
                    <p className="text-xs font-mono text-center break-all mt-0.5">{barcode.barcodeCode}</p>
                    <p className="text-xs text-center text-muted-foreground mt-0">No of keys: {barcode.noOfKeys}</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredBarcodes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No barcodes found. Add some barcodes to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
