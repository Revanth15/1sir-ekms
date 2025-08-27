"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { subscribeToLogs, type ActivityLog } from "@/lib/logging-service"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    const unsubscribe = subscribeToLogs((logsData) => {
      setLogs(logsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, companyFilter, actionFilter, dateRange])

  const filterLogs = () => {
    let filtered = logs
  
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.keyNo.includes(searchTerm) ||
          log.barcodeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.maskedNric.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.number.toLowerCase().includes(searchTerm.toLowerCase())
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
  
    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(
        (log) =>
          log.timestamp >= dateRange.from! &&
          log.timestamp <= new Date(dateRange.to!.getTime() + 24 * 60 * 60 * 1000 - 1) // include full "to" day
      )
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

  const isFilterActive =
  searchTerm !== "" || companyFilter !== "all" || actionFilter !== "all" || (dateRange?.from && dateRange?.to)

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

            <Popover>
              <PopoverTrigger asChild>
              <button className="flex items-center justify-between w-full rounded-md border px-3 py-2 text-sm">
                  {dateRange?.from ? (
                    dateRange?.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Select date range</span>
                  )}
                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* {isFilterActive && (
                <Button
                  className="px-3 py-2 mt-2 col-span-full md:col-auto"
                  variant={"destructive"}
                  onClick={() => {
                    setSearchTerm("")
                    setCompanyFilter("all")
                    setActionFilter("all")
                    setDateRange(undefined)
                  }}
                >
                  Clear Filters
                </Button>
              )} */}
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
                  <TableHead>Action By</TableHead>
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
                          log.action === "sign-out"
                            ? "bg-red-100 text-red-800"
                            : log.action === "close-book"
                            ? "bg-yellow-200 text-gray-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {log.action === "sign-out"
                          ? "KEY SIGNED OUT"
                          : log.action === "close-book"
                          ? "BOOK CLOSED"
                          : "KEY SIGNED IN"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.company}</TableCell>
                    <TableCell>{log.location}</TableCell>
                    <TableCell>{log.keyNo}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{log.barcodeCode}</span>
                    </TableCell>
                    <TableCell>{`${log.rank} ${log.name} (${log.number})`}</TableCell>
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
