import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, QrCode, ExternalLink, Pencil, Link2, ImageUp, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  qrCodeImageUrl?: string
  qrCodeDestinationUrl?: string
}

interface RowInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  point: DeliveryPoint
  isEditMode: boolean
  onSave?: (updated: DeliveryPoint) => void
}

const DELIVERY_COLORS: Record<string, string> = {
  Daily:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  Weekday: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "Alt 1": "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "Alt 2": "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
}

export function RowInfoModal({ open, onOpenChange, point, isEditMode, onSave }: RowInfoModalProps) {
  const [drafts, setDrafts] = useState<{ key: string; value: string }[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("")
  const [qrCodeDestinationUrl, setQrCodeDestinationUrl] = useState("")
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [qrTab, setQrTab] = useState<"url" | "media">("url")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setDrafts(point.descriptions ?? [])
      setQrCodeImageUrl(point.qrCodeImageUrl ?? "")
      setQrCodeDestinationUrl(point.qrCodeDestinationUrl ?? "")
      setIsEditing(false)
    }
  }, [open, point])

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  const hasCoords = point.latitude !== 0 && point.longitude !== 0

  const handleAdd = () => setDrafts(prev => [...prev, { key: "", value: "" }])
  const handleRemove = (i: number) => setDrafts(prev => prev.filter((_, idx) => idx !== i))
  const handleChange = (i: number, field: "key" | "value", val: string) =>
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d))

  const handleSave = () => {
    onSave?.({ ...point, descriptions: drafts.filter(d => d.key.trim() !== ""), qrCodeImageUrl, qrCodeDestinationUrl })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDrafts(point.descriptions ?? [])
    setIsEditing(false)
  }

  const gmapsUrl = `https://maps.google.com/?q=${point.latitude},${point.longitude}`
  const wazeUrl = `https://waze.com/ul?ll=${point.latitude},${point.longitude}&navigate=yes`
  const familyMartUrl = `https://fmvending.web.app/refill-service/M${String(point.code).padStart(4, "0")}`

  const openUrl = (url: string) => setPendingUrl(url)
  const confirmOpen = () => {
    if (pendingUrl) {
      window.open(pendingUrl, "_blank")
      setPendingUrl(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow">
              {point.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-white truncate">
                {point.name}
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border shadow-sm ${DELIVERY_COLORS[point.delivery] ?? ""}`}>
                  {point.delivery}
                </span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                  {point.code}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 bg-white dark:bg-neutral-900">
          {/* Information section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 dark:text-gray-400">Information</p>
              {isEditMode && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                {drafts.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Key"
                      value={d.key}
                      onChange={e => handleChange(i, "key", e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <Input
                      placeholder="Value"
                      value={d.value}
                      onChange={e => handleChange(i, "value", e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium mt-1"
                >
                  <Plus className="size-3.5" />
                  Add field
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-300 dark:border-neutral-700 overflow-hidden shadow-sm">
                {point.descriptions && point.descriptions.length > 0 ? (
                  point.descriptions.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 dark:border-neutral-800 last:border-0 bg-gray-50 dark:bg-neutral-800/50"
                    >
                        <span className="w-24 shrink-0 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate">
                        {d.key}
                      </span>
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {d.value}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No Information</p>
                )}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          {!isEditing && (
            <div className="flex gap-3 justify-center">
              {hasCoords && (
                <>
                  <button
                    onClick={() => openUrl(gmapsUrl)}
                    title="Google Maps"
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden shadow hover:shadow-md transition-all group-hover:scale-105">
                      <img src="/Gmaps.png" alt="Google Maps" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400">Google Maps</span>
                  </button>
                  <button
                    onClick={() => openUrl(wazeUrl)}
                    title="Waze"
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden shadow hover:shadow-md transition-all group-hover:scale-105">
                      <img src="/waze.png" alt="Waze" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-gray-400">Waze</span>
                  </button>
                </>
              )}
              <button
                onClick={() => openUrl(familyMartUrl)}
                title="FamilyMart"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow hover:shadow-md transition-all group-hover:scale-105">
                  <img src="/FamilyMart.png" alt="FamilyMart" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-gray-600 dark:text-gray-400">FamilyMart</span>
              </button>

              {/* QR Code Button — shown if QR exists or in edit mode */}
              {(qrCodeImageUrl || isEditMode) && (
                <button
                  onClick={() => setShowQRDialog(true)}
                  title={qrCodeImageUrl ? "QR Code" : "Add QR Code"}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="relative w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center shadow hover:shadow-md transition-all group-hover:scale-105">
                    <QrCode className="w-5 h-5 text-white" />
                    {isEditMode && (
                      <span className="absolute -top-1 -right-1 bg-background rounded-full p-0.5">
                        {qrCodeImageUrl
                          ? <Pencil className="w-2.5 h-2.5" />
                          : <Plus className="w-2.5 h-2.5" />}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">QR Code</span>
                </button>
              )}
            </div>
          )}

          {/* QR Code dialog */}
          <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
            <DialogContent className="max-w-xs rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {isEditMode ? "QR Code Settings" : "QR Code"}
                </DialogTitle>
                {!isEditMode && (
                  <DialogDescription>
                    Scan the QR code or open the destination link.
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-3">
                {/* QR Image preview */}
                {qrCodeImageUrl && (
                  <div className="relative flex justify-center">
                    <img
                      src={qrCodeImageUrl}
                      alt="QR Code"
                      className="w-40 h-40 object-contain border rounded-xl"
                    />
                    {isEditMode && (
                      <button
                        onClick={() => { setQrCodeImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {isEditMode && (
                  <>
                    {/* Tabs */}
                    <div className="flex rounded-lg border overflow-hidden">
                      <button
                        onClick={() => setQrTab("url")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                          qrTab === "url"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        URL
                      </button>
                      <button
                        onClick={() => setQrTab("media")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                          qrTab === "media"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        <ImageUp className="w-3.5 h-3.5" />
                        Media
                      </button>
                    </div>

                    {/* Tab: URL */}
                    {qrTab === "url" && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">QR Image URL</label>
                        <Input
                          value={qrCodeImageUrl}
                          onChange={e => setQrCodeImageUrl(e.target.value)}
                          placeholder="https://example.com/qr.png"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    {/* Tab: Media */}
                    {qrTab === "media" && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Upload Image</label>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-5 cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <ImageUp className="w-7 h-7 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Click to choose image</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onloadend = () => setQrCodeImageUrl(reader.result as string)
                            reader.readAsDataURL(file)
                          }}
                        />
                      </div>
                    )}

                    {/* Destination URL — always visible in edit mode */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Destination URL</label>
                      <Input
                        value={qrCodeDestinationUrl}
                        onChange={e => setQrCodeDestinationUrl(e.target.value)}
                        placeholder="https://example.com/destination"
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="flex gap-2 justify-end">
                {isEditMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowQRDialog(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => { handleSave(); setShowQRDialog(false) }}>Save</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowQRDialog(false)}>Close</Button>
                    {qrCodeDestinationUrl && (
                      <Button size="sm" onClick={() => { openUrl(qrCodeDestinationUrl); setShowQRDialog(false) }}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Open Link
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirmation dialog */}
          <Dialog open={!!pendingUrl} onOpenChange={(o) => { if (!o) setPendingUrl(null) }}>
            <DialogContent className="max-w-xs rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base">Open Link?</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-500">You will be taken to an external app or website.</p>
                    <p className="text-xs font-mono break-all bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 rounded-lg px-2.5 py-1.5">
                      {pendingUrl}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setPendingUrl(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmOpen}>
                  Open
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Footer — only in edit mode */}
        {isEditing && (
          <div className="px-5 pb-5 flex gap-2 justify-end bg-white dark:bg-neutral-900">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
