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

    // Remove both classes first
    root.classList.remove("light", "dark")

    // Add the current theme class
    root.classList.add(theme)

    // Save to localStorage
    localStorage.setItem("theme", theme)

    // Update theme-color meta tags for browser UI
    const color = theme === "dark" ? "#020817" : "#ffffff"
    
    // Update all theme-color meta tags
    const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]')
    themeColorMetas.forEach((meta) => {
      meta.setAttribute("content", color)
    })
    
    // If no theme-color meta exists, create one
    if (themeColorMetas.length === 0) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = color
      document.head.appendChild(meta)
    }

    // Update Apple status bar style
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (appleStatusBar) {
      appleStatusBar.setAttribute("content", theme === "dark" ? "black-translucent" : "black-translucent")
    }

    // Update manifest theme color dynamically
    const manifestLink = document.querySelector('link[rel="manifest"]')
    if (manifestLink) {
      // Force browser to re-read manifest
      const href = manifestLink.getAttribute('href')
      if (href) {
        manifestLink.setAttribute('href', '')
        setTimeout(() => manifestLink.setAttribute('href', href), 0)
      }
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return { theme, setTheme, toggleTheme }
}
