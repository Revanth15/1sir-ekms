"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSavedBarcodes, type SavedBarcode } from "@/lib/barcode-service"
import { toast } from "sonner"

export default function DashboardPage() {
  const [barcodes, setBarcodes] = useState<SavedBarcode[]>([])
  const [filteredBarcodes, setFilteredBarcodes] = useState<SavedBarcode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    loadBarcodes()
  }, [])

  useEffect(() => {
    filterBarcodes()
  }, [barcodes, searchTerm, companyFilter, statusFilter])

  const loadBarcodes = async () => {
    try {
      const data = await getSavedBarcodes()
      setBarcodes(data)
    } catch (error) {
      toast.error("Failed to load barcodes")
    } finally {
      setLoading(false)
    }
  }

  const filterBarcodes = () => {
    let filtered = barcodes

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (barcode) =>
          barcode.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          barcode.keyNo.includes(searchTerm) ||
          barcode.barcodeCode.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter((barcode) => barcode.company === companyFilter)
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((barcode) => {
        const isDrawn = barcode.lastDraw && (!barcode.lastReturn || barcode.lastDraw > barcode.lastReturn)
        return statusFilter === "drawn" ? isDrawn : !isDrawn
      })
    }

    setFilteredBarcodes(filtered)
  }

  const getKeyStatus = (barcode: SavedBarcode) => {
    if (!barcode.lastDraw && !barcode.lastReturn) {
      return { status: "available", color: "bg-green-100 text-green-800" }
    }

    const isDrawn = barcode.lastDraw && (!barcode.lastReturn || barcode.lastDraw > barcode.lastReturn)
    return isDrawn
      ? { status: "drawn", color: "bg-red-100 text-red-800" }
      : { status: "available", color: "bg-green-100 text-green-800" }
  }

  const companies = Array.from(new Set(barcodes.map((b) => b.company)))

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Key Management Dashboard</h1>
        <p className="text-muted-foreground mt-2">Monitor all keys and their current status</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{barcodes.length}</div>
            <div className="text-sm text-muted-foreground">Total Keys</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {barcodes.filter((b) => getKeyStatus(b).status === "available").length}
            </div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {barcodes.filter((b) => getKeyStatus(b).status === "drawn").length}
            </div>
            <div className="text-sm text-muted-foreground">Drawn Out</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{companies.length}</div>
            <div className="text-sm text-muted-foreground">Companies</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by location, key no, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="drawn">Drawn Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Keys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBarcodes.map((barcode) => {
          const keyStatus = getKeyStatus(barcode)
          return (
            <Card key={barcode.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    {barcode.company}-{barcode.location}-{barcode.keyNo}
                  </CardTitle>
                  <Badge className={keyStatus.color}>{keyStatus.status.toUpperCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Location:</span> {barcode.location}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Key No:</span> {barcode.keyNo}
                </div>
                <div className="text-sm">
                  <span className="font-medium">No of Keys:</span> {barcode.noOfKeys}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Barcode:</span>
                  <span className="font-mono text-xs ml-1">{barcode.barcodeCode}</span>
                </div>

                {/* Timestamps */}
                <div className="pt-2 border-t space-y-1">
                  {barcode.lastDraw && (
                    <div className="text-xs text-red-600">Last Draw: {barcode.lastDraw.toLocaleString()}</div>
                  )}
                  {barcode.lastReturn && (
                    <div className="text-xs text-green-600">Last Return: {barcode.lastReturn.toLocaleString()}</div>
                  )}
                  {barcode.lastUpdate && (
                    <div className="text-xs text-muted-foreground">
                      Last Update: {barcode.lastUpdate.toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredBarcodes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No keys found matching your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
