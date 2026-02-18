import { useState } from "react"
import { Edit2, Trash2, MapPin, Clock, Navigation } from "lucide-react"
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "./AnimatedModal"
import { useModal } from "./AnimatedModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  description: string
}

interface RowInfoModalProps {
  point: DeliveryPoint
  rowIndex: number
  isEditMode: boolean
  trigger?: React.ReactNode
  onSave?: (updated: DeliveryPoint) => void
  onDelete?: (point: DeliveryPoint) => void
}

const DELIVERY_COLORS: Record<string, string> = {
  Daily:   "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  Weekday: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "Alt 1": "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "Alt 2": "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
}

const HISTORY = [
  { action: "Updated",  details: "Modified delivery type",    user: "Admin",  daysAgo: 1 },
  { action: "Created",  details: "Delivery point created",    user: "System", daysAgo: 3 },
  { action: "Updated",  details: "Changed coordinates",       user: "Admin",  daysAgo: 5 },
]

function RowInfoModalInner({
  point: initPoint,
  rowIndex,
  isEditMode,
  onSave,
  onDelete,
}: Omit<RowInfoModalProps, "trigger">) {
  const { setOpen } = useModal()
  const [tab, setTab] = useState<"details" | "history">("details")
  const [searchText, setSearchText] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<DeliveryPoint>(initPoint)
  const point = initPoint

  // Field list
  const fields: { label: string; value: string | number }[] = [
    { label: "Code",        value: point.code },
    { label: "Name",        value: point.name },
    { label: "Delivery",    value: point.delivery },
    { label: "Latitude",    value: point.latitude },
    { label: "Longitude",   value: point.longitude },
    { label: "Description", value: point.description || "—" },
  ]

  const filtered = searchText
    ? fields.filter(f =>
        f.label.toLowerCase().includes(searchText.toLowerCase()) ||
        String(f.value).toLowerCase().includes(searchText.toLowerCase())
      )
    : fields

  const handleSave = () => {
    onSave?.(draft)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm(`Delete "${point.name}"? This cannot be undone.`)) {
      onDelete?.(point)
      setOpen(false)
    }
  }

  const openGoogleMaps = () =>
    window.open(`https://maps.google.com/?q=${point.latitude},${point.longitude}`, "_blank")
  const openWaze = () =>
    window.open(`https://waze.com/ul?ll=${point.latitude},${point.longitude}&navigate=yes`, "_blank")

  return (
    <>
      <ModalContent>
        {/* ── Header ── */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-neutral-700">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">
            {point.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {point.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">#{rowIndex}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${DELIVERY_COLORS[point.delivery] ?? ""}`}>
                {point.delivery}
              </span>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {point.code}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-4 mb-3 border-b border-gray-100 dark:border-neutral-700">
          {(["details", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px]
                ${tab === t
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <>
            {/* ── Search ── */}
            {!isEditing && (
              <div className="relative mb-4">
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search fields…"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            )}

            {/* ── Edit Form ── */}
            {isEditing ? (
              <div className="space-y-3">
                {[
                  { key: "code",        label: "Code",        type: "text"   },
                  { key: "name",        label: "Name",        type: "text"   },
                  { key: "description", label: "Description", type: "text"   },
                  { key: "latitude",    label: "Latitude",    type: "number" },
                  { key: "longitude",   label: "Longitude",   type: "number" },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</label>
                    <Input
                      type={type}
                      step={type === "number" ? "0.000001" : undefined}
                      value={(draft as unknown as Record<string, string | number>)[key]}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Delivery Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["Daily", "Weekday", "Alt 1", "Alt 2"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setDraft(prev => ({ ...prev, delivery: type }))}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                          draft.delivery === type
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-200 dark:border-neutral-600 hover:bg-accent"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Details Grid ── */
              <div className="space-y-1">
                {filtered.length > 0 ? filtered.map(f => (
                  <div key={f.label} className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-neutral-800 last:border-0">
                    <p className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 pt-px">
                      {f.label}
                    </p>
                    <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
                      {String(f.value)}
                    </p>
                  </div>
                )) : (
                  <p className="text-center py-6 text-sm text-gray-400">No matching fields</p>
                )}
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            {!isEditing && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
                <button
                  onClick={openGoogleMaps}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow hover:shadow-md hover:-translate-y-0.5"
                >
                  <Navigation className="size-4" />
                  Google Maps
                </button>
                <button
                  onClick={openWaze}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-sm font-medium rounded-xl hover:from-cyan-500 hover:to-blue-600 transition-all shadow hover:shadow-md hover:-translate-y-0.5"
                >
                  <MapPin className="size-4" />
                  Waze
                </button>
              </div>
            )}

            {/* ── Coordinates card ── */}
            {!isEditing && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1 text-center bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-neutral-700">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Latitude</p>
                  <p className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">{point.latitude.toFixed(6)}</p>
                </div>
                <div className="flex-1 text-center bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-neutral-700">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Longitude</p>
                  <p className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">{point.longitude.toFixed(6)}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── History Tab ── */
          <div className="space-y-2 mt-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="size-4" />
              Activity History
            </h3>
            {HISTORY.map((entry, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.details}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">by {entry.user}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {entry.daysAgo === 1 ? "Yesterday" : `${entry.daysAgo} days ago`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalContent>

      {/* ── Footer ── */}
      <ModalFooter>
        {isEditMode && tab === "details" && (
          <>
            {isEditing ? (
              <>
                <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Save Changes
                </Button>
                <Button onClick={() => { setDraft(initPoint); setIsEditing(false) }} size="sm" variant="outline">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleDelete} size="sm" variant="destructive">
                  <Trash2 className="size-3.5 mr-1.5" />
                  Delete
                </Button>
                <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                  <Edit2 className="size-3.5 mr-1.5" />
                  Edit
                </Button>
              </>
            )}
          </>
        )}
        {!isEditMode && (
          <Button onClick={() => setOpen(false)} size="sm" variant="outline">
            Close
          </Button>
        )}
      </ModalFooter>
    </>
  )
}

export function RowInfoModal({ point, rowIndex, isEditMode, trigger, onSave, onDelete }: RowInfoModalProps) {
  return (
    <Modal>
      {trigger ?? (
        <ModalTrigger className="!p-1.5 !text-xs">Info</ModalTrigger>
      )}
      <ModalBody>
        <RowInfoModalInner
          point={point}
          rowIndex={rowIndex}
          isEditMode={isEditMode}
          onSave={onSave}
          onDelete={onDelete}
        />
      </ModalBody>
    </Modal>
  )
}
