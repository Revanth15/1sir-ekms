"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { subscribeToLogs, type ActivityLog } from "@/lib/logging-service"

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")

  useEffect(() => {
    const unsubscribe = subscribeToLogs((logsData) => {
      setLogs(logsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, companyFilter, actionFilter])

  const filterLogs = () => {
    let filtered = logs

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.keyNo.includes(searchTerm) ||
          log.barcodeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.maskedNric.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Company filter
    if (companyFilter !== "all") {
      filtered = filtered.filter((log) => log.company === companyFilter)
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    setFilteredLogs(filtered)
  }

  const companies = Array.from(new Set(logs.map((log) => log.company)))

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading activity logs...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 min-h-screen bg-neutral-800">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-muted-foreground">Total Activities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {logs.filter((log) => log.action === "sign-in").length}
            </div>
            <div className="text-sm text-muted-foreground">Sign-ins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {logs.filter((log) => log.action === "sign-out").length}
            </div>
            <div className="text-sm text-muted-foreground">Sign-outs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Array.from(new Set(logs.map((log) => log.maskedNric))).length}</div>
            <div className="text-sm text-muted-foreground">Unique Users</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by NRIC, location, key no, or barcode..."
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
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="sign-in">Sign-in</SelectItem>
                <SelectItem value="sign-out">Sign-out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History ({filteredLogs.length} activities)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>NRIC</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Key No</TableHead>
                  <TableHead>Barcode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="text-sm">
                        <div>{log.timestamp.toLocaleDateString()}</div>
                        <div className="text-muted-foreground text-xs">{log.timestamp.toLocaleTimeString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{log.maskedNric}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.action === "sign-out" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }
                      >
                        {log.action === "sign-out" ? "OUT" : "IN"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.company}</TableCell>
                    <TableCell>{log.location}</TableCell>
                    <TableCell>{log.keyNo}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{log.barcodeCode}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No activity logs found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
