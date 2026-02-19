export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="sticky bottom-0 z-20 shrink-0 border-t border-border/40 bg-background/90 backdrop-blur-sm">
      <p className="text-center text-[11px] text-muted-foreground/60 py-1.5">
        © {year} SpeedParcel Senawang. All rights reserved.
      </p>
    </footer>
  )
}
