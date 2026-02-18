import React, { createContext, useContext, useEffect, useState } from "react"

// ─── Context ─────────────────────────────────────────────────────────────────
interface ModalContextType {
  open: boolean
  setOpen: (v: boolean) => void
}
const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false)
  return (
    <ModalContext.Provider value={{ open, setOpen }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error("useModal must be used within ModalProvider")
  return ctx
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
export function Modal({ children }: { children: React.ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>
}

// ─── Trigger ─────────────────────────────────────────────────────────────────
export const ModalTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { setOpen } = useModal()
  return (
    <button
      className={`px-4 py-2 rounded-lg text-white bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg ${className ?? ""}`}
      onClick={() => setOpen(true)}
    >
      {children}
    </button>
  )
}

// ─── Body (overlay + modal card) ─────────────────────────────────────────────
export const ModalBody = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { open, setOpen } = useModal()

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ animation: "modalFadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-[calc(100vw-2rem)] max-w-lg bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl flex flex-col overflow-hidden shadow-2xl ${className ?? ""}`}
        style={{ animation: "modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton />
        {children}
      </div>
    </div>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────
export const ModalContent = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div className={`flex flex-col flex-1 p-6 overflow-y-auto ${className ?? ""}`}>
    {children}
  </div>
)

// ─── Footer ──────────────────────────────────────────────────────────────────
export const ModalFooter = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div className={`flex justify-end gap-2 px-6 py-4 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 ${className ?? ""}`}>
    {children}
  </div>
)

// ─── Close Button ─────────────────────────────────────────────────────────────
const CloseButton = () => {
  const { setOpen } = useModal()
  return (
    <button
      onClick={() => setOpen(false)}
      className="absolute top-4 right-4 z-10 group w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-500 group-hover:text-red-500 group-hover:rotate-90 transition-all duration-200"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    </button>
  )
}
