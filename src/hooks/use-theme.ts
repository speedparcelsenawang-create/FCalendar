import { useEffect, useState } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) return stored

    // Check system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark"
    }

    return "light"
  })

  useEffect(() => {
    const root = document.documentElement

    // Atomic class swap — toggle avoids the brief no-class gap that causes grey flash
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")

    // Save to localStorage
    localStorage.setItem("theme", theme)

    // Theme-color values that match the actual CSS --background variable:
    //   light: oklch(1 0 0)     → #ffffff
    //   dark:  oklch(0.145 0 0) → #242424
    const color = theme === "dark" ? "#242424" : "#ffffff"

    // Update ALL theme-color metas (handles the ones with media query too)
    const allMetas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (allMetas.length === 0) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.setAttribute("content", color)
      document.head.appendChild(meta)
    } else {
      allMetas.forEach((meta) => meta.setAttribute("content", color))
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return { theme, setTheme, toggleTheme }
}
