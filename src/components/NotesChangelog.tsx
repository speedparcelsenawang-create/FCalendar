import { useState, useEffect, useRef } from "react"
import { useEditMode } from "@/contexts/EditModeContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Plus, Trash2, Pin, PinOff, Loader2,
  StickyNote, History, ChevronDown, ChevronUp,
  Tag, User, Calendar
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface NoteEntry {
  id: string
  type: "note" | "changelog"
  title: string
  content: string
  version: string | null
  author: string
  pinned: boolean
  created_at: string
  updated_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function NoteCard({
  note,
  isEditMode,
  onDelete,
  onTogglePin,
}: {
  note: NoteEntry
  isEditMode: boolean
  onDelete: (id: string) => void
  onTogglePin: (note: NoteEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = note.content.length > 200

  return (
    <div
      className={`
        relative rounded-xl border bg-card text-card-foreground shadow-sm
        transition-all duration-200 hover:shadow-md
        ${note.pinned ? "border-yellow-400 dark:border-yellow-500 bg-yellow-50/40 dark:bg-yellow-900/10" : ""}
      `}
    >
      {note.pinned && (
        <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-yellow-400 dark:bg-yellow-500 px-2 py-0.5 text-[10px] font-semibold text-yellow-900 shadow">
          <Pin className="size-2.5" /> Pinned
        </span>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-snug flex-1">
            {note.title || <span className="text-muted-foreground italic">Untitled</span>}
          </h3>
          {isEditMode && (
            <div className="flex items-center gap-1 shrink-0 -mt-0.5">
              <button
                onClick={() => onTogglePin(note)}
                title={note.pinned ? "Unpin" : "Pin"}
                className="rounded p-1 text-muted-foreground hover:text-yellow-500 hover:bg-muted transition-colors"
              >
                {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </button>
              <button
                onClick={() => onDelete(note.id)}
                title="Delete"
                className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <div
          className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? "line-clamp-4" : ""}`}
        >
          {note.content}
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? <><ChevronUp className="size-3" /> Show less</> : <><ChevronDown className="size-3" /> Show more</>}
          </button>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <User className="size-3" /> {note.author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" /> {formatDateTime(note.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

function ChangelogCard({
  entry,
  isEditMode,
  onDelete,
}: {
  entry: NoteEntry
  isEditMode: boolean
  onDelete: (id: string) => void
}) {
  const lines = entry.content
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)

  return (
    <div className="relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {entry.version && (
              <span className="inline-flex items-center gap-1 w-fit rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                <Tag className="size-2.5" /> v{entry.version}
              </span>
            )}
            <h3 className="font-semibold text-sm leading-snug">
              {entry.title || <span className="text-muted-foreground italic">Untitled update</span>}
            </h3>
          </div>
          {isEditMode && (
            <button
              onClick={() => onDelete(entry.id)}
              title="Delete"
              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors shrink-0 -mt-0.5"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>

        <ul className="space-y-1">
          {lines.map((line, i) => {
            const isItem = line.startsWith("-") || line.startsWith("•")
            const text = isItem ? line.slice(1).trim() : line
            return (
              <li
                key={i}
                className={`flex items-start gap-2 text-sm text-muted-foreground leading-relaxed ${isItem ? "" : "font-medium text-foreground"}`}
              >
                {isItem && <span className="mt-1.5 size-1.5 rounded-full bg-primary/50 shrink-0" />}
                <span>{text}</span>
              </li>
            )
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <User className="size-3" /> {entry.author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" /> {formatDate(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Add Note Form ───────────────────────────────────────────────────────────

function AddNoteForm({
  onAdd,
  loading,
}: {
  onAdd: (data: { title: string; content: string; author: string; pinned: boolean }) => Promise<void>
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("Admin")
  const [pinned, setPinned] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!content.trim()) return
    await onAdd({ title, content, author, pinned })
    setTitle("")
    setContent("")
    setPinned(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); setTimeout(() => textRef.current?.focus(), 50) }}>
        <Plus className="size-3.5 mr-1" /> Add Note
      </Button>
    )
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <h4 className="text-sm font-semibold">New Note</h4>
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="text-sm"
      />
      <textarea
        ref={textRef}
        placeholder="Write your note here…"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none outline-none ring-0 focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 transition-all"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Author"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="text-sm max-w-[140px]"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
          Pin to top
        </label>
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Changelog Form ──────────────────────────────────────────────────────

function AddChangelogForm({
  onAdd,
  loading,
}: {
  onAdd: (data: { title: string; content: string; version: string; author: string }) => Promise<void>
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [version, setVersion] = useState("")
  const [author, setAuthor] = useState("Admin")
  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!content.trim()) return
    await onAdd({ title, content, version, author })
    setTitle("")
    setContent("")
    setVersion("")
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); setTimeout(() => textRef.current?.focus(), 50) }}>
        <Plus className="size-3.5 mr-1" /> Add Changelog
      </Button>
    )
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <h4 className="text-sm font-semibold">New Changelog Entry</h4>
      <div className="flex gap-2">
        <Input
          placeholder="Version (e.g. 1.2.0)"
          value={version}
          onChange={e => setVersion(e.target.value)}
          className="text-sm max-w-[160px]"
        />
        <Input
          placeholder="Title / Summary"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-sm flex-1"
        />
      </div>
      <textarea
        ref={textRef}
        placeholder={"List changes, one per line:\n- Fixed delivery map loading\n- Added dark mode support"}
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={5}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none outline-none ring-0 focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 transition-all"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Author"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="text-sm max-w-[140px]"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !content.trim()}>
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = "notes" | "changelog"

export function NotesChangelog() {
  const { isEditMode } = useEditMode()
  const [tab, setTab] = useState<Tab>("notes")
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [changelogs, setChangelogs] = useState<NoteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/notes")
      const json = await res.json()
      if (json.success) {
        const all: NoteEntry[] = json.data
        setNotes(all.filter(n => n.type === "note"))
        setChangelogs(all.filter(n => n.type === "changelog"))
      }
    } catch {
      toast.error("Failed to load notes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAddNote = async (data: {
    title: string; content: string; author: string; pinned: boolean
  }) => {
    setSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: uid(), type: "note", ...data }),
      })
      const json = await res.json()
      if (json.success) { toast.success("Note saved"); await fetchAll() }
      else toast.error(json.error ?? "Failed to save")
    } catch { toast.error("Network error") }
    finally { setSaving(false) }
  }

  const handleAddChangelog = async (data: {
    title: string; content: string; version: string; author: string
  }) => {
    setSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: uid(), type: "changelog", ...data }),
      })
      const json = await res.json()
      if (json.success) { toast.success("Changelog entry saved"); await fetchAll() }
      else toast.error(json.error ?? "Failed to save")
    } catch { toast.error("Network error") }
    finally { setSaving(false) }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) { toast.success("Deleted"); await fetchAll() }
      else toast.error(json.error ?? "Failed to delete")
    } catch { toast.error("Network error") }
    finally { setSaving(false) }
  }

  // ── Toggle pin ────────────────────────────────────────────────────────────
  const handleTogglePin = async (note: NoteEntry) => {
    setSaving(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...note, pinned: !note.pinned }),
      })
      const json = await res.json()
      if (json.success) { await fetchAll() }
      else toast.error(json.error ?? "Failed to update")
    } catch { toast.error("Network error") }
    finally { setSaving(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-1 flex-col gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full overflow-y-auto"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div>
        <h1 className="text-fluid-xl page-header font-bold text-gray-900 dark:text-white">
          Notes &amp; Changelog
        </h1>
        <p className="text-fluid-sm page-subheader text-muted-foreground mt-1">
          Public notes and update history visible to all users.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["notes", "changelog"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all
              ${tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"}
            `}
          >
            {t === "notes" ? <StickyNote className="size-3.5" /> : <History className="size-3.5" />}
            {t === "notes" ? "Notes" : "Changelog"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading…
        </div>
      ) : tab === "notes" ? (
        // ── Notes Tab ───────────────────────────────────────────────────────
        <div className="flex flex-col gap-3">
          {isEditMode && (
            <AddNoteForm onAdd={handleAddNote} loading={saving} />
          )}
          {notes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-muted-foreground text-sm">
              No notes yet.
              {isEditMode && " Click \"Add Note\" to create one."}
            </div>
          ) : (
            notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isEditMode={isEditMode}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
              />
            ))
          )}
        </div>
      ) : (
        // ── Changelog Tab ────────────────────────────────────────────────────
        <div className="flex flex-col gap-3">
          {isEditMode && (
            <AddChangelogForm onAdd={handleAddChangelog} loading={saving} />
          )}
          {changelogs.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-muted-foreground text-sm">
              No changelog entries yet.
              {isEditMode && " Click \"Add Changelog\" to create one."}
            </div>
          ) : (
            changelogs.map(entry => (
              <ChangelogCard
                key={entry.id}
                entry={entry}
                isEditMode={isEditMode}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
