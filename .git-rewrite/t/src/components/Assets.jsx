import { useState, useRef, useEffect } from 'react'
import { Monitor, Plus, Search, AlertTriangle, PenTool, TrendingDown, Upload, FileSignature, Wrench, CheckCircle, BadgeCheck, MessageSquare, AlertCircle, Laptop, Smartphone, Speaker, Mouse, Key, User } from 'lucide-react'
import AdSlot from './AdSlot'
import { useModal } from '../services/useModal.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '../services/date.js'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Select, SelectItem } from "@/components/ui/select"

const categoryIcons = {
  'Laptop': <Laptop className="w-4 h-4" />,
  'Phone': <Smartphone className="w-4 h-4" />,
  'Monitor': <Monitor className="w-4 h-4" />,
  'Peripherals': <Mouse className="w-4 h-4" />,
  'Access Card': <Key className="w-4 h-4" />
}

function AssetInventory({ filteredAssets, stats, assets, search, setSearch, filterCategory, setFilterCategory, alerts, showAddModal, setShowAddModal, newAsset, setNewAsset, handleAddAsset, triggerFileInput, fileInputRef, handleImportCSV, addToast }) {
  const [detailAsset, setDetailAsset] = useState(null)

  const categories = [
    { label: 'Laptops', key: 'Laptop' },
    { label: 'Phones', key: 'Phone' },
    { label: 'Monitors', key: 'Monitor' },
    { label: 'Peripherals', key: 'Peripherals' },
    { label: 'Access Cards', key: 'Access Card' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Integrated Dashboard Metrics - Creative Touch */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border bg-card hover:border-primary/50 transition-all duration-300 group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
             <Monitor size={80} />
          </div>
          <CardContent className="p-5 flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2 text-primary font-medium mb-2">
              <div className="p-1.5 bg-primary/10 rounded-md"><Monitor size={16} /></div> Total Assets
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs border-border bg-card hover:border-green-500/50 transition-all duration-300 group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-green-600">
             <CheckCircle size={80} />
          </div>
          <CardContent className="p-5 flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
              <div className="p-1.5 bg-green-500/10 rounded-md"><CheckCircle size={16} /></div> Available
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.available}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card hover:border-blue-500/50 transition-all duration-300 group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-blue-600">
             <BadgeCheck size={80} />
          </div>
          <CardContent className="p-5 flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2 text-blue-600 font-medium mb-2">
              <div className="p-1.5 bg-blue-500/10 rounded-md"><BadgeCheck size={16} /></div> Assigned
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border bg-card hover:border-orange-500/50 transition-all duration-300 group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 text-orange-600">
             <Wrench size={80} />
          </div>
          <CardContent className="p-5 flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2 text-orange-600 font-medium mb-2">
              <div className="p-1.5 bg-orange-500/10 rounded-md"><Wrench size={16} /></div> Under Repair
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.underRepair}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
           <Button variant={filterCategory === 'All' ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory('All')} className="rounded-full h-8 px-4 text-xs">
             All Assets
           </Button>
           {categories.map(cat => {
             const count = assets.filter(a => a.category === cat.key).length
             return (
               <Button key={cat.key} variant={filterCategory === cat.key ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(cat.key)} className="rounded-full h-8 px-4 text-xs flex items-center gap-1.5">
                 {categoryIcons[cat.key]} {cat.label} <span className="opacity-50 ml-1">({count})</span>
               </Button>
             )
           })}
        </div>
      </div>

      <Card className="shadow-xs border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-muted/20">
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="Search by name or serial number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-input shadow-sm" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={triggerFileInput} className="shadow-sm">
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <Button onClick={() => setShowAddModal(true)} className="shadow-sm shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Asset ID / Serial</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Financials</TableHead>
              <TableHead>Warranty</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.map(asset => (
              <TableRow key={asset.id} onClick={() => setDetailAsset(asset)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <TableCell>
                  <div className="font-semibold">{asset.id}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">SN: {asset.serialNumber}</div>
                </TableCell>
                <TableCell className="font-medium text-foreground">{asset.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    {categoryIcons[asset.category] || <Monitor className="w-4 h-4" />}
                    <span>{asset.category}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">${asset.purchasePrice}</div>
                  <div className="text-xs text-muted-foreground">{asset.purchaseDate}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    {asset.warrantyExpiry}
                    {alerts.find(a => a.id === asset.id) && <AlertTriangle className="h-4 w-4 text-orange-500 drop-shadow-sm" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={
                    asset.status === 'Available' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400 border border-green-500/20' :
                    asset.status === 'Assigned' ? 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20' :
                    asset.status === 'Under Repair' ? 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20' : 'bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400 border border-red-500/20'
                  }>{asset.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredAssets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center p-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-base font-medium text-foreground">No assets found</p>
                    <p className="text-sm mt-1">Try adjusting your search query or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {detailAsset && (
        <DetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      )}
    </div>
  )
}

function DetailModal({ asset, onClose }) {
  useModal(onClose)
  const calculateBookValue = (asset) => {
    if (asset.purchasePrice === undefined || asset.purchasePrice === null || !asset.purchaseDate || !asset.usefulLife) return asset.purchasePrice || 0
    const purchaseDate = new Date(asset.purchaseDate)
    const today = new Date()
    const monthsElapsed = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth())
    if (monthsElapsed >= asset.usefulLife) return 0
    const monthlyDepreciation = asset.purchasePrice / asset.usefulLife
    const bookValue = asset.purchasePrice - (monthlyDepreciation * monthsElapsed)
    return Math.max(0, bookValue).toFixed(2)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
        <div className="bg-muted/30 p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-1">{asset.name}</DialogTitle>
              <DialogDescription className="text-sm">Asset ID: {asset.id} &nbsp;•&nbsp; SN: {asset.serialNumber}</DialogDescription>
            </div>
            <Badge className={asset.status === 'Available' ? 'bg-green-500' : asset.status === 'Assigned' ? 'bg-blue-500' : 'bg-orange-500'}>{asset.status}</Badge>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
            <div><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Category</div><div className="flex items-center gap-1.5 text-sm">{categoryIcons[asset.category] || <Monitor className="w-3 h-3"/>} {asset.category}</div></div>
            <div><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Condition</div><div className="font-medium text-sm">{asset.condition}</div></div>
            <div><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Purchase Date</div><div className="font-medium text-sm">{asset.purchaseDate}</div></div>
            
            <div><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Purchase Price</div><div className="font-medium text-sm">${asset.purchasePrice}</div></div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Current Book Value</div>
              <div className="font-bold text-green-600 bg-green-500/10 inline-block px-2 py-0.5 rounded text-sm">${calculateBookValue(asset)}</div>
            </div>
            
            <div><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Useful Life</div><div className="font-medium text-sm">{asset.usefulLife} months</div></div>
            <div className="col-span-2 md:col-span-1"><div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Warranty Expiry</div><div className="font-medium text-sm">{asset.warrantyExpiry}</div></div>
          </div>

          {asset.maintenanceLogs?.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Maintenance History</h3>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-2">
                {asset.maintenanceLogs.map(log => (
                  <div key={log.id} className="p-3 bg-muted/40 rounded-lg border border-border text-sm flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{log.vendor}</span>
                      <span className="text-red-600 font-medium bg-red-500/10 px-1.5 py-0.5 rounded">${log.cost}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{log.date}</div>
                    <div className="text-muted-foreground text-xs mt-1">{log.issue}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <Button onClick={onClose} variant="outline">Close Details</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AssetAssignments({ assets, employees, assignForm, setAssignForm, setAssignTarget, assignTarget, showAssignModal, setShowAssignModal, handleAssignAsset, handleReturnAsset, generateAgreementPDF }) {
  const [filterStatus, setFilterStatus] = useState('All')
  const assignableAssets = assets.filter(a => filterStatus === 'All' ? (a.status === 'Available' || a.status === 'Assigned') : a.status === filterStatus)

  return (
    <div className="flex flex-col gap-5">
      <Card className="shadow-xs border-border p-2 inline-flex flex-wrap gap-2 self-start bg-card">
        {['All', 'Available', 'Assigned'].map(s => (
          <Button key={s} variant={s === filterStatus ? 'default' : 'ghost'} size="sm" onClick={() => setFilterStatus(s)}>
            {s}
          </Button>
        ))}
      </Card>

      <Card className="shadow-xs border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Asset Details</TableHead>
              <TableHead>Status & Assignee</TableHead>
              <TableHead>Assignment Date</TableHead>
              <TableHead>Condition Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignableAssets.map(asset => {
              const emp = asset.assignedTo ? employees.find(e => e.id === asset.assignedTo) : null
              return (
                <TableRow key={asset.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-semibold text-sm">{asset.name}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{asset.id}</div>
                  </TableCell>
                  <TableCell>
                    {asset.status === 'Assigned' && emp ? (
                      <div className="flex items-center gap-3">
                        {emp.avatar ? <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" /> : <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-primary/20"><User size={16} /></div>}
                        <div>
                          <div className="font-medium text-sm">{emp.name}</div>
                          <div className="text-[11px] text-muted-foreground">{emp.department}</div>
                        </div>
                      </div>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20 dark:text-green-400">Available In Inventory</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{asset.assignmentDate || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell className="text-sm">{asset.condition || <span className="text-muted-foreground/50">—</span>}</TableCell>
                  <TableCell>
                    {asset.status === 'Available' ? (
                      <Button size="sm" onClick={() => { setAssignTarget(asset); setShowAssignModal(true) }} className="shadow-sm">
                        Assign Asset
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => generateAgreementPDF(asset, emp, asset.condition)}>
                          <FileSignature className="h-4 w-4 mr-2" /> Agreement
                        </Button>
                        <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => handleReturnAsset(asset.id)}>
                          Return
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {assignableAssets.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No assets found matching filter.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {showAssignModal && (
        <AssignAssetModal showAssignModal={showAssignModal} setShowAssignModal={setShowAssignModal} assignTarget={assignTarget} assignForm={assignForm} setAssignForm={setAssignForm} handleAssignAsset={handleAssignAsset} employees={employees} />
      )}
    </div>
  )
}

function AssignAssetModal({ showAssignModal, setShowAssignModal, assignTarget, assignForm, setAssignForm, handleAssignAsset, employees }) {
  useModal(() => setShowAssignModal(false))

  return (
    <Dialog open={true} onOpenChange={(open) => !open && setShowAssignModal(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>Assigning {assignTarget?.name} ({assignTarget?.serialNumber})</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleAssignAsset} className="flex flex-col gap-4 py-4">
          <Select label="Select Employee" value={assignForm.employeeId} onChange={(val) => setAssignForm(p => ({...p, employeeId: val}))} placeholder="-- Choose Employee --">
            {employees.map(emp => (
              <SelectItem key={emp.id} id={emp.id}>{emp.name} ({emp.department})</SelectItem>
            ))}
          </Select>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Condition Notes</label>
            <Input type="text" value={assignForm.notes} onChange={e => setAssignForm(p => ({...p, notes: e.target.value}))} />
          </div>
          
          <div className="p-3 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs flex items-start gap-2 border border-blue-500/20 mt-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>An official Asset Assignment Agreement PDF will be auto-generated and downloaded upon assignment.</p>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button type="submit">Confirm Assignment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssetRequests({ assetRequests, employees, handleRequestAction }) {
  return (
    <div className="flex flex-col gap-4">
      {assetRequests.length === 0 ? (
        <Card className="shadow-xs border-border border-dashed bg-card/50">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
               <MessageSquare className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No Pending Requests</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">There are currently no open asset requests from employees. When employees request new equipment, it will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        assetRequests.map(req => {
          const emp = employees.find(e => e.id === req.employeeId) || { name: 'Unknown' }
          return (
            <Card key={req.id} className="shadow-xs border-border transition-all hover:shadow-md hover:border-primary/20">
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="font-semibold text-base">{emp.name}</span>
                    <span className="text-muted-foreground text-sm">requested a</span>
                    <span className="font-bold text-primary flex items-center gap-1">
                       {categoryIcons[req.category]} {req.category}
                    </span>
                    <Badge variant="outline" className={req.urgency === 'High' ? 'text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 ml-2' : req.urgency === 'Medium' ? 'text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950/30 ml-2' : 'text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-950/30 ml-2'}>
                      {req.urgency} Priority
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 italic flex gap-3 items-start">
                    <span className="text-2xl leading-none text-muted-foreground/30 font-serif">"</span>
                    <div className="pt-1">{req.justification}</div>
                  </div>
                </div>
                {req.status === 'Pending' ? (
                  <div className="flex sm:flex-col gap-2 min-w-[120px]">
                    <Button className="w-full" onClick={() => handleRequestAction(req.id, 'Approved')}>Approve</Button>
                    <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleRequestAction(req.id, 'Rejected')}>Reject</Button>
                  </div>
                ) : (
                  <div className="min-w-[120px] text-right">
                    <Badge className={req.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>{req.status}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

function AssetMaintenance({ assets, selectedAssetForMaint, setSelectedAssetForMaint, maintForm, setMaintForm, handleAddMaintenance, calculateBookValue }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
      <Card className="shadow-xs border-border sticky top-4">
        <CardHeader className="pb-3 border-b border-border bg-muted/10">
          <CardTitle className="text-lg">Inventory List</CardTitle>
          <CardDescription>Select an asset to log a repair</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col max-h-[600px] overflow-y-auto">
            {assets.map(asset => (
              <button key={asset.id}
                className={`flex flex-col p-4 border-b border-border text-left transition-colors hover:bg-muted/50 ${selectedAssetForMaint?.id === asset.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                onClick={() => setSelectedAssetForMaint(asset)}>
                <div className="flex justify-between w-full mb-1 items-center">
                  <span className="font-semibold text-sm break-words pr-2 text-foreground">{asset.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wider">{asset.id}</span>
                </div>
                <div className="flex justify-between w-full items-center mt-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${asset.status === 'Under Repair' ? 'text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/20' : asset.status === 'Assigned' ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20' : 'text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20'}`}>
                    {asset.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {categoryIcons[asset.category]} {asset.category}
                  </span>
                </div>
              </button>
            ))}
            {assets.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No assets in inventory</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {selectedAssetForMaint ? (
          <>
            <Card className="shadow-xs border-border bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <TrendingDown className="h-6 w-6 text-primary" />
                  <h3 className="text-lg font-bold">Depreciation & Value</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purchase Price</div><div className="text-2xl font-bold text-foreground">${selectedAssetForMaint.purchasePrice}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Book Value</div><div className="text-2xl font-bold text-green-600">${calculateBookValue(selectedAssetForMaint)}</div></div>
                  <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Useful Life</div><div className="font-medium text-lg mt-1">{selectedAssetForMaint.usefulLife} <span className="text-sm text-muted-foreground">months</span></div></div>
                  <div><div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Condition</div><div className="font-medium text-lg mt-1">{selectedAssetForMaint.condition}</div></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardHeader className="pb-4 border-b border-border bg-muted/10">
                <CardTitle className="text-base flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-orange-500" /> Log New Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleAddMaintenance} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Maintenance Date</label>
                      <Input type="date" required value={maintForm.date} onChange={e => setMaintForm(p => ({...p, date: e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Repair Cost ($)</label>
                      <Input type="number" required placeholder="0.00" value={maintForm.cost} onChange={e => setMaintForm(p => ({...p, cost: e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Vendor / Service Center</label>
                    <Input type="text" required placeholder="e.g. Apple Store, Dell Service" value={maintForm.vendor} onChange={e => setMaintForm(p => ({...p, vendor: e.target.value}))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Issue Description</label>
                    <textarea required rows={3} placeholder="Describe what is being repaired..." className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={maintForm.issue} onChange={e => setMaintForm(p => ({...p, issue: e.target.value}))} />
                  </div>
                  <div className="flex justify-start mt-2">
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">Submit Log & Mark as Under Repair</Button>
                  </div>
                </form>

                {selectedAssetForMaint.maintenanceLogs?.length > 0 && (
                  <div className="mt-10">
                    <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Repair History Log
                    </h4>
                    <div className="flex flex-col gap-3">
                      {selectedAssetForMaint.maintenanceLogs.map(log => (
                        <div key={log.id} className="p-4 rounded-xl border border-border bg-muted/20 text-sm hover:bg-muted/40 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-base">{log.vendor}</span>
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30">${log.cost}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-mono">
                            <span>{log.date}</span>
                            <span>•</span>
                            <span>{log.id}</span>
                          </div>
                          <div className="text-foreground">{log.issue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-xs border-border border-dashed bg-card/50 h-full min-h-[400px] flex items-center justify-center">
            <CardContent className="flex flex-col items-center text-center p-6">
              <div className="p-4 bg-muted rounded-full mb-4">
                 <Wrench className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Asset Selected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">Select an asset from the list on the left to view depreciation details and log maintenance.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function AddAssetModal({ showAddModal, setShowAddModal, newAsset, setNewAsset, handleAddAsset }) {
  useModal(() => setShowAddModal(false))

  return (
    <Dialog open={true} onOpenChange={(open) => !open && setShowAddModal(false)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
          <DialogDescription>Register a new company asset into the inventory system.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleAddAsset} className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Asset Name</label>
              <Input type="text" required placeholder="e.g. MacBook Pro M3" value={newAsset.name} onChange={e => setNewAsset(p => ({...p, name: e.target.value}))} />
            </div>
            <Select label="Category" value={newAsset.category} onChange={(val) => setNewAsset(p => ({...p, category: val}))}>
              <SelectItem id="Laptop">Laptop</SelectItem>
              <SelectItem id="Phone">Phone</SelectItem>
              <SelectItem id="Monitor">Monitor</SelectItem>
              <SelectItem id="Peripherals">Peripherals</SelectItem>
              <SelectItem id="Access Card">Access Card</SelectItem>
            </Select>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Serial Number / IMEI</label>
              <Input type="text" required placeholder="SN12345678" value={newAsset.serialNumber} onChange={e => setNewAsset(p => ({...p, serialNumber: e.target.value}))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input type="date" required value={newAsset.purchaseDate} onChange={e => setNewAsset(p => ({...p, purchaseDate: e.target.value}))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Purchase Price ($)</label>
              <Input type="number" required placeholder="0.00" value={newAsset.purchasePrice} onChange={e => setNewAsset(p => ({...p, purchasePrice: e.target.value}))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Useful Life (Months)</label>
              <Input type="number" required placeholder="36" value={newAsset.usefulLife} onChange={e => setNewAsset(p => ({...p, usefulLife: e.target.value}))} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-sm font-medium">Warranty Expiry Date</label>
              <Input type="date" required value={newAsset.warrantyExpiry} onChange={e => setNewAsset(p => ({...p, warrantyExpiry: e.target.value}))} />
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Save Asset</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Assets({ employees, assets, setAssets, assetRequests, setAssetRequests, addLog, addToast, currentUser, simulatedRole }) {
  // SETTING DEFAULT TO INVENTORY AS DASHBOARD IS REMOVED
  const [activeView, setActiveView] = useState('inventory')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    const expiring = (assets || []).filter(a => {
      if (!a.warrantyExpiry) return false
      const exp = new Date(a.warrantyExpiry)
      return exp > today && exp <= thirtyDaysFromNow
    })
    setAlerts(expiring)
  }, [assets])

  const [showAddModal, setShowAddModal] = useState(false)
  useModal(() => setShowAddModal(false))
  const [newAsset, setNewAsset] = useState({ name: '', category: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', warrantyExpiry: '', usefulLife: 36, condition: 'New' })

  const handleAddAsset = (e) => {
    e.preventDefault()
    const asset = {
      ...newAsset,
      id: `AST-${Date.now()}`,
      purchasePrice: parseFloat(newAsset.purchasePrice) || 0,
      usefulLife: parseInt(newAsset.usefulLife) || 36,
      status: 'Available',
      assignedTo: null,
      assignmentDate: null,
      maintenanceLogs: []
    }
    setAssets(prev => [asset, ...prev])
    setShowAddModal(false)
    addToast('Asset added to inventory', 'success')
    addLog('Asset "' + newAsset.name + '" added to inventory')
    setNewAsset({ name: '', category: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', warrantyExpiry: '', usefulLife: 36, condition: 'New' })
  }

  const fileInputRef = useRef(null)
  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click() }

  const handleImportCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const rows = text.split('\n')
      const headers = rows[0].split(',').map(h => h.trim())
      const importedAssets = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row.trim()) continue
        const cols = row.split(',').map(c => c.trim())
        if (cols.length >= 6) {
          importedAssets.push({
            id: `AST-${Date.now()}-${i}`,
            name: cols[0],
            category: cols[1],
            serialNumber: cols[2],
            purchaseDate: cols[3],
            purchasePrice: parseFloat(cols[4]) || 0,
            warrantyExpiry: cols[5],
            usefulLife: parseInt(cols[6]) || 36,
            status: 'Available',
            assignedTo: null,
            assignmentDate: null,
            condition: 'New',
            maintenanceLogs: []
          })
        }
      }

      if (importedAssets.length > 0) {
        setAssets(prev => [...importedAssets, ...prev])
        addToast(`Successfully imported ${importedAssets.length} assets`, 'success')
      } else {
        addToast('No valid data found in CSV.', 'error')
      }
      e.target.value = null
    }
    reader.readAsText(file)
  }

  const [showAssignModal, setShowAssignModal] = useState(false)
  useModal(() => setShowAssignModal(false))
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignForm, setAssignForm] = useState({ employeeId: '', notes: 'Good condition' })

  const handleAssignAsset = (e) => {
    e.preventDefault()
    if (!assignForm.employeeId) return addToast('Select an employee', 'warning')

    setAssets(prev => prev.map(a => {
      if (a.id === assignTarget.id) {
        return {
          ...a,
          status: 'Assigned',
          assignedTo: assignForm.employeeId,
          assignmentDate: new Date().toISOString().split('T')[0],
          condition: assignForm.notes
        }
      }
      return a
    }))

    setShowAssignModal(false)
    addToast('Asset assigned successfully', 'success')
    addLog('Asset "' + assignTarget.name + '" assigned to ' + (employees.find(emp => emp.id === assignForm.employeeId)?.name || 'unknown'))
    generateAgreementPDF(assignTarget, employees.find(emp => emp.id === assignForm.employeeId), assignForm.notes)
  }

  const generateAgreementPDF = (asset, employee, notes = 'Good condition') => {
    try {
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text('Asset Assignment Agreement', 20, 20)

      doc.setFontSize(12)
      doc.text(`Date: ${formatDate(new Date().toISOString().split('T')[0])}`, 20, 30)
      doc.text(`Employee Name: ${employee.name} (${employee.department})`, 20, 40)
      doc.text('This document confirms the assignment of the following company property:', 20, 55)

      autoTable(doc, {
        startY: 60,
        head: [['Asset ID', 'Name', 'Category', 'Serial Number', 'Condition']],
        body: [
          [asset.id, asset.name, asset.category, asset.serialNumber, notes]
        ]
      })

      const finalY = (doc.lastAutoTable?.finalY ?? 90) + 20

      doc.text('Terms and Conditions:', 20, finalY)
      doc.setFontSize(10)
      doc.text('1. The asset remains the property of HR Pulse Ltd.', 20, finalY + 10)
      doc.text('2. The employee agrees to keep the asset in good condition.', 20, finalY + 20)
      doc.text('3. The employee must return the asset upon termination of employment.', 20, finalY + 30)

      doc.text('Employee Signature: _______________________', 20, finalY + 60)
      doc.text('Date: ________________', 120, finalY + 60)

      doc.text('HR Signature: _______________________', 20, finalY + 80)
      doc.text('Date: ________________', 120, finalY + 80)

      doc.save(`Asset_Agreement_${employee.id}_${asset.id}.pdf`)
      addToast('Agreement PDF generated', 'info')
    } catch (e) {
      console.error(e)
      addToast('Error generating PDF', 'error')
    }
  }

  const handleReturnAsset = (id) => {
    const asset = assets.find(a => a.id === id)
    setAssets(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: 'Available', assignedTo: null, assignmentDate: null }
      }
      return a
    }))
    addToast('Asset returned to inventory', 'success')
    if (asset) addLog('Asset "' + asset.name + '" returned to inventory')
  }

  const handleRequestAction = (reqId, action) => {
    setAssetRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: action } : r))
    addToast(`Request ${action.toLowerCase()}`, 'info')
    addLog('Asset request ' + action.toLowerCase())
  }

  const [selectedAssetForMaint, setSelectedAssetForMaint] = useState(null)
  const [maintForm, setMaintForm] = useState({ date: '', issue: '', cost: '', vendor: '' })

  const handleAddMaintenance = (e) => {
    e.preventDefault()
    setAssets(prev => prev.map(a => {
      if (a.id === selectedAssetForMaint.id) {
        return {
          ...a,
          status: 'Under Repair',
          maintenanceLogs: [...(a.maintenanceLogs || []), { id: `maint-${Date.now()}`, date: maintForm.date, issue: maintForm.issue, cost: parseFloat(maintForm.cost) || 0, vendor: maintForm.vendor, status: 'In Progress' }]
        }
      }
      return a
    }))
    setMaintForm({ date: '', issue: '', cost: '', vendor: '' })
    setSelectedAssetForMaint(null)
    addToast('Maintenance log added, asset marked as Under Repair', 'success')
    addLog('Maintenance logged for "' + selectedAssetForMaint.name + '"')
  }

  const calculateBookValue = (asset) => {
    if (asset.purchasePrice === undefined || asset.purchasePrice === null || !asset.purchaseDate || !asset.usefulLife) return asset.purchasePrice || 0
    const purchaseDate = new Date(asset.purchaseDate)
    const today = new Date()
    const monthsElapsed = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth())
    if (monthsElapsed >= asset.usefulLife) return 0

    const monthlyDepreciation = asset.purchasePrice / asset.usefulLife
    const bookValue = asset.purchasePrice - (monthlyDepreciation * monthsElapsed)
    return Math.max(0, bookValue).toFixed(2)
  }

  const stats = {
    total: assets?.length || 0,
    available: assets?.filter(a => a.status === 'Available').length || 0,
    assigned: assets?.filter(a => a.status === 'Assigned').length || 0,
    underRepair: assets?.filter(a => a.status === 'Under Repair').length || 0,
  }

  const filteredAssets = (assets || []).filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.serialNumber.toLowerCase().includes(search.toLowerCase())
    const matchesCat = filterCategory === 'All' ? true : a.category === filterCategory
    return matchesSearch && matchesCat
  })

  const renderView = () => {
    switch (activeView) {
      case 'inventory':
        return <AssetInventory stats={stats} assets={assets || []} filteredAssets={filteredAssets} search={search} setSearch={setSearch} filterCategory={filterCategory} setFilterCategory={setFilterCategory} alerts={alerts} showAddModal={showAddModal} setShowAddModal={setShowAddModal} newAsset={newAsset} setNewAsset={setNewAsset} handleAddAsset={handleAddAsset} triggerFileInput={triggerFileInput} fileInputRef={fileInputRef} handleImportCSV={handleImportCSV} addToast={addToast} />
      case 'assignments':
        return <AssetAssignments assets={assets} employees={employees} assignForm={assignForm} setAssignForm={setAssignForm} setAssignTarget={setAssignTarget} assignTarget={assignTarget} showAssignModal={showAssignModal} setShowAssignModal={setShowAssignModal} handleAssignAsset={handleAssignAsset} handleReturnAsset={handleReturnAsset} generateAgreementPDF={generateAgreementPDF} />
      case 'requests':
        return <AssetRequests assetRequests={assetRequests} employees={employees} handleRequestAction={handleRequestAction} />
      case 'maintenance':
        return <AssetMaintenance assets={assets} selectedAssetForMaint={selectedAssetForMaint} setSelectedAssetForMaint={setSelectedAssetForMaint} maintForm={maintForm} setMaintForm={setMaintForm} handleAddMaintenance={handleAddMaintenance} calculateBookValue={calculateBookValue} />
      default:
        return <AssetInventory stats={stats} assets={assets || []} filteredAssets={filteredAssets} search={search} setSearch={setSearch} filterCategory={filterCategory} setFilterCategory={setFilterCategory} alerts={alerts} showAddModal={showAddModal} setShowAddModal={setShowAddModal} newAsset={newAsset} setNewAsset={setNewAsset} handleAddAsset={handleAddAsset} triggerFileInput={triggerFileInput} fileInputRef={fileInputRef} handleImportCSV={handleImportCSV} addToast={addToast} />
    }
  }

  return (
    <div className="animate-fade-in pb-10 flex flex-col gap-6 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
          <Laptop size={20} className="text-primary" />
          Asset Management
        </h1>
      </div>
      <div className="border-t border-border" />
      
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border w-full max-w-full">
        {['inventory', 'assignments', 'requests', 'maintenance'].map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 font-medium text-sm transition-colors relative whitespace-nowrap outline-none ${activeView === view ? 'text-primary border-b-2 border-primary -mb-[1px]' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
            {view === 'requests' && assetRequests?.filter(r => r.status === 'Pending').length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {assetRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {alerts.length > 0 && activeView === 'inventory' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span><strong>Alert:</strong> {alerts.length} asset(s) have warranties expiring within 30 days</span>
        </div>
      )}

      {renderView()}

      {showAddModal && (
        <AddAssetModal showAddModal={showAddModal} setShowAddModal={setShowAddModal} newAsset={newAsset} setNewAsset={setNewAsset} handleAddAsset={handleAddAsset} />
      )}

      <AdSlot className="mt-8" type="horizontal" />
    </div>
  )
}
