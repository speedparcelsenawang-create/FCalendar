import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StickyNote, History, Plus, Trash2, Clock } from "lucide-react"

export interface RouteNote {
  id: string
  text: string
  createdAt: string
}

export interface RouteChangelog {
  id: string
  description: string
  createdAt: string
}

function storageKey(type: "notes" | "changelog", routeId: string) {
  return `fcalendar_${type}_${routeId}`
}

export function loadNotes(routeId: string): RouteNote[] {
  try {
    const raw = localStorage.getItem(storageKey("notes", routeId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function loadChangelog(routeId: string): RouteChangelog[] {
  try {
    const raw = localStorage.getItem(storageKey("changelog", routeId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function appendChangelog(routeId: string, description: string) {
  const existing = loadChangelog(routeId)
  const entry: RouteChangelog = {
    id: crypto.randomUUID(),
    description,
    createdAt: new Date().toISOString(),
  }
  const updated = [entry, ...existing].slice(0, 100) // keep max 100
  localStorage.setItem(storageKey("changelog", routeId), JSON.stringify(updated))
}

function saveNotes(routeId: string, notes: RouteNote[]) {
  localStorage.setItem(storageKey("notes", routeId), JSON.stringify(notes))
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })
}

function formatExact(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-MY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  routeId: string
  routeName: string
}

export function RouteNotesModal({ open, onOpenChange, routeId, routeName }: Props) {
  const [tab, setTab] = useState<"notes" | "changelog">("notes")
  const [notes, setNotes] = useState<RouteNote[]>([])
  const [changelog, setChangelog] = useState<RouteChangelog[]>([])
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load from localStorage when modal opens
  useEffect(() => {
    if (open) {
      setNotes(loadNotes(routeId))
      setChangelog(loadChangelog(routeId))
    }
  }, [open, routeId])

  const addNote = () => {
    const text = input.trim()
    if (!text) return
    const note: RouteNote = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(routeId, updated)
    setInput("")
    textareaRef.current?.focus()
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(routeId, updated)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden rounded-2xl flex flex-col" style={{ maxHeight: "85dvh" }}>
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle className="text-sm font-semibold truncate">{routeName}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex px-4 pt-3 gap-1 shrink-0">
          <button
            onClick={() => setTab("notes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "notes"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <StickyNote className="size-3.5" />
            Notes
            {notes.length > 0 && (
              <span className={`text-[10px] px-1 rounded-full ${tab === "notes" ? "bg-background/20" : "bg-muted-foreground/20"}`}>
                {notes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("changelog")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "changelog"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <History className="size-3.5" />
            Changelog
            {changelog.length > 0 && (
              <span className={`text-[10px] px-1 rounded-full ${tab === "changelog" ? "bg-background/20" : "bg-muted-foreground/20"}`}>
                {changelog.length}
              </span>
            )}
          </button>
        </div>

        <div className="h-px bg-border/50 mx-4 mt-2 shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "notes" ? (
            <div className="flex flex-col h-full">
              {/* Note list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <StickyNote className="size-8 opacity-25" />
                    <p className="text-sm">No notes yet</p>
                    <p className="text-xs opacity-60">Add a note below</p>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-muted/40 rounded-xl px-3 py-2.5 group relative">
                      <p className="text-sm text-foreground whitespace-pre-wrap pr-6">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock className="size-2.5" />
                        <span title={formatExact(note.createdAt)}>{formatTime(note.createdAt)}</span>
                      </p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border/50 shrink-0 space-y-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote()
                  }}
                  placeholder="Write a note… (Ctrl+Enter to add)"
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-xl bg-muted/50 resize-none outline-none ring-1 ring-border/50 focus:ring-primary/40 placeholder:text-muted-foreground/40 transition-shadow"
                />
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={addNote}
                  disabled={!input.trim()}
                >
                  <Plus className="size-3.5 mr-1" /> Add Note
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              {changelog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <History className="size-8 opacity-25" />
                  <p className="text-sm">No changes recorded yet</p>
                  <p className="text-xs opacity-60">Changes are recorded when you save</p>
                </div>
              ) : (
                changelog.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3 items-start">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0 mt-1">
                      <div className={`size-2 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                      {i < changelog.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1 mb-0" style={{ minHeight: "20px" }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-[12px] text-foreground leading-snug">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="size-2.5" />
                        <span title={formatExact(entry.createdAt)}>{formatTime(entry.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
