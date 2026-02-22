import { useState, useEffect } from "react"
import { ImageIcon, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

interface PlanoImage {
  id: string
  url: string
  title: string
  description: string
}

interface PlanoRow {
  id: string
  title: string
  images: PlanoImage[]
}

interface PlanoPage {
  id: string
  name: string
  rows: PlanoRow[]
}

interface FlatImage extends PlanoImage {
  pageName: string
  rowTitle: string
}

export function Album() {
  const [pages, setPages] = useState<PlanoPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [filterPage, setFilterPage] = useState<string>("all")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/plano")
        if (!res.ok) throw new Error("Failed to load")
        const json = await res.json()
        setPages(json.data ?? [])
      } catch (e: any) {
        setLoadError(e.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Flatten all images from all pages/rows
  const allImages: FlatImage[] = pages.flatMap(page =>
    page.rows.flatMap(row =>
      row.images.map(img => ({
        ...img,
        pageName: page.name,
        rowTitle: row.title,
      }))
    )
  )

  const filteredImages =
    filterPage === "all"
      ? allImages
      : allImages.filter(img => img.pageName === filterPage)

  const pageNames = pages.map(p => p.name)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const goPrev = () => setLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))
  const goNext = () =>
    setLightboxIndex(i =>
      i !== null && i < filteredImages.length - 1 ? i + 1 : i
    )

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "Escape") closeLightbox()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxIndex])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading album…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-destructive text-sm">
        {loadError}
      </div>
    )
  }

  if (allImages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <ImageIcon className="size-12 opacity-30" />
        <p className="text-sm">No images uploaded yet.</p>
        <p className="text-xs text-muted-foreground/60">Upload images in Plano VM to see them here.</p>
      </div>
    )
  }

  const activeLightboxImg =
    lightboxIndex !== null ? filteredImages[lightboxIndex] : null

  return (
    <div
      className="flex flex-col flex-1 min-h-0 overflow-y-auto"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold">Album</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allImages.length} images across {pages.length} pages
        </p>
      </div>

      {/* Page filter chips */}
      {pageNames.length > 0 && (
        <div className="px-4 pb-4 max-w-5xl mx-auto w-full flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterPage("all")}
            className={`h-7 px-3 rounded-lg text-xs font-medium transition-all ${
              filterPage === "all"
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
            }`}
          >
            All
          </button>
          {pageNames.map(name => (
            <button
              key={name}
              onClick={() => setFilterPage(name)}
              className={`h-7 px-3 rounded-lg text-xs font-medium transition-all ${
                filterPage === name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Image grid */}
      <div className="px-4 max-w-5xl mx-auto w-full">
        {filteredImages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No images in this page.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {filteredImages.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => openLightbox(idx)}
                className="relative group aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border/40 shadow-sm hover:ring-primary/50 hover:shadow-md transition-all"
              >
                <img
                  src={img.url}
                  alt={img.title || "Plano image"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e2e8f0'/%3E%3C/svg%3E"
                  }}
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end">
                  {img.title && (
                    <p className="w-full px-2 pb-2 pt-6 text-[11px] text-white font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                      {img.title}
                    </p>
                  )}
                </div>
                {/* Page badge */}
                <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium truncate max-w-[70%] opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.pageName}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {activeLightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="size-5" />
          </button>

          {/* Prev */}
          {lightboxIndex! > 0 && (
            <button
              onClick={e => { e.stopPropagation(); goPrev() }}
              className="absolute left-3 z-10 size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image */}
          <div className="flex flex-col items-center max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={activeLightboxImg.url}
              alt={activeLightboxImg.title}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            {(activeLightboxImg.title || activeLightboxImg.description) && (
              <div className="mt-3 text-center">
                {activeLightboxImg.title && (
                  <p className="text-white font-semibold text-sm">{activeLightboxImg.title}</p>
                )}
                {activeLightboxImg.description && (
                  <p className="text-white/60 text-xs mt-0.5">{activeLightboxImg.description}</p>
                )}
                <p className="text-white/40 text-xs mt-1">{activeLightboxImg.pageName} · {activeLightboxImg.rowTitle}</p>
              </div>
            )}
            <p className="text-white/30 text-xs mt-2">
              {lightboxIndex! + 1} / {filteredImages.length}
            </p>
          </div>

          {/* Next */}
          {lightboxIndex! < filteredImages.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); goNext() }}
              className="absolute right-3 z-10 size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
