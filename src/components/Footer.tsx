import { MapPin, Heart } from "lucide-react"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="shrink-0 mt-auto border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" />
            <span className="font-semibold text-foreground">FCalendar</span>
          </div>
          <span className="text-border">·</span>
          <span>SpeedParcel Senawang</span>
        </div>

        {/* Center — tagline */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Built with <Heart className="size-3 text-red-500 fill-red-500" /> for delivery operations
        </p>

        {/* Right — copyright */}
        <p className="text-xs text-muted-foreground">
          © {year} SpeedParcel. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
