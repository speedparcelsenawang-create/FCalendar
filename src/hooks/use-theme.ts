import { useEffect, useState } from "react"

export type ColorMode = "light" | "dark"
export type ColorTheme =
  | "default"
  | "bubblegum"
  | "candyland"
  | "claude"
  | "cyberpunk"
  | "northern-lights"
  | "ocean-breeze"

export function useTheme() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const stored = localStorage.getItem("color-mode") as ColorMode | null
    if (stored === "light" || stored === "dark") return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("color-theme") as ColorTheme | null
    return stored ?? "default"
  })

  useEffect(() => {
    const root = document.documentElement

    // Apply dark/light class
    root.classList.toggle("dark", mode === "dark")
    root.classList.toggle("light", mode === "light")

    // Apply data-theme attribute
    if (colorTheme === "default") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", colorTheme)
    }

    localStorage.setItem("color-mode", mode)
    localStorage.setItem("color-theme", colorTheme)

    // Update theme-color meta
    const color = mode === "dark" ? "#1a1a2e" : "#ffffff"
    const allMetas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (allMetas.length === 0) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.setAttribute("content", color)
      document.head.appendChild(meta)
    } else {
      allMetas.forEach((meta) => meta.setAttribute("content", color))
    }
  }, [mode, colorTheme])

  const toggleMode = () => setMode((prev) => (prev === "light" ? "dark" : "light"))

  // Backward-compat alias used by old ThemeToggle
  const theme = mode
  const setTheme = setMode
  const toggleTheme = toggleMode

  return { theme, setTheme, toggleTheme, mode, setMode, toggleMode, colorTheme, setColorTheme }
}
