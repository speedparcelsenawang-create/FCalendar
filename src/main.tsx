import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { registerServiceWorker } from "./lib/pwa"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Fade out splash screen after React mounts
requestAnimationFrame(() => {
  const splash = document.getElementById("splash")
  if (splash) {
    splash.classList.add("fade-out")
    splash.addEventListener("transitionend", () => splash.remove(), { once: true })
  }
})

// Register service worker for PWA functionality
registerServiceWorker()
