"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SavedBarcode } from "@/lib/barcode-service"
import { toast } from "sonner"
import { onSnapshot, collection, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardPage() {
  const [barcodes, setBarcodes] = useState<SavedBarcode[]>([])
  const [filteredBarcodes, setFilteredBarcodes] = useState<SavedBarcode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const q = query(collection(db, "barcodes"))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const barcodesData: SavedBarcode[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          lastUpdate: doc.data().lastUpdate?.toDate() || null,
          lastReturn: doc.data().lastReturn?.toDate() || null,
          lastDraw: doc.data().lastDraw?.toDate() || null,
        })) as SavedBarcode[]

        setBarcodes(barcodesData)
        setLoading(false)
      },
      (error) => {
        console.error("Error listening to barcodes:", error)
        toast.error("Failed to load barcodes")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterBarcodes()
  }, [barcodes, searchTerm, companyFilter, statusFilter])

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
        <h1 className="text-3xl font-bold">1 SIR Key Management Dashboard</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Keys Overview ({filteredBarcodes.length} keys)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Key No</TableHead>
                  <TableHead>No of Keys</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Last Draw</TableHead>
                  <TableHead>Last Return</TableHead>
                  <TableHead>Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarcodes.map((barcode) => {
                  const keyStatus = getKeyStatus(barcode)
                  return (
                    <TableRow key={barcode.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{barcode.company}</TableCell>
                      <TableCell>{barcode.location}</TableCell>
                      <TableCell>{barcode.keyNo}</TableCell>
                      <TableCell>{barcode.noOfKeys}</TableCell>
                      <TableCell>
                        <Badge className={keyStatus.color}>{keyStatus.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{barcode.barcodeCode}</span>
                      </TableCell>
                      <TableCell>
                        {barcode.lastDraw ? (
                          <span className="text-red-600 text-xs">
                            {barcode.lastDraw.toLocaleDateString()} {barcode.lastDraw.toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {barcode.lastReturn ? (
                          <span className="text-green-600 text-xs">
                            {barcode.lastReturn.toLocaleDateString()} {barcode.lastReturn.toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {barcode.lastUpdate ? (
                          <span className="text-muted-foreground text-xs">
                            {barcode.lastUpdate.toLocaleDateString()} {barcode.lastUpdate.toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredBarcodes.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No keys found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
