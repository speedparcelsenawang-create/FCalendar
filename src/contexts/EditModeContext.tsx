import { createContext, useContext, useState, useRef, type ReactNode } from "react"
import { Toast } from "primereact/toast"

interface EditModeContextType {
  isEditMode: boolean
  hasUnsavedChanges: boolean
  isSaving: boolean
  setIsEditMode: (value: boolean) => void
  setHasUnsavedChanges: (value: boolean) => void
  saveChanges: () => void
  registerSaveHandler: (handler: () => Promise<void>) => void
  discardChanges: () => void
  registerDiscardHandler: (handler: () => void) => void
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined)

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null)
  const discardHandlerRef = useRef<(() => void) | null>(null)
  const toastRef = useRef<any>(null)

  const registerSaveHandler = (handler: () => Promise<void>) => {
    saveHandlerRef.current = handler
  }

  const registerDiscardHandler = (handler: () => void) => {
    discardHandlerRef.current = handler
  }

  const saveChanges = async () => {
    if (saveHandlerRef.current) {
      setIsSaving(true)
      try {
        await saveHandlerRef.current()
        setHasUnsavedChanges(false)
        toastRef.current?.show({ severity: "success", summary: "Saved", detail: "Changes saved successfully.", life: 5000 })
      } catch (e) {
        toastRef.current?.show({ severity: "error", summary: "Save failed", detail: e instanceof Error ? e.message : "Unknown error", life: 5000 })
      } finally {
        setIsSaving(false)
      }
    } else {
      setHasUnsavedChanges(false)
    }
  }

  const discardChanges = () => {
    if (discardHandlerRef.current) {
      discardHandlerRef.current()
    }
    setHasUnsavedChanges(false)
  }

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        hasUnsavedChanges,
        isSaving,
        setIsEditMode,
        setHasUnsavedChanges,
        saveChanges,
        registerSaveHandler,
        discardChanges,
        registerDiscardHandler,
      }}
    >
      <Toast ref={toastRef} position="top-right" />
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (context === undefined) {
    return {
      isEditMode: false,
      hasUnsavedChanges: false,
      isSaving: false,
      setIsEditMode: () => {},
      setHasUnsavedChanges: () => {},
      saveChanges: () => {},
      registerSaveHandler: () => {},
      discardChanges: () => {},
      registerDiscardHandler: () => {},
    }
  }
  return context
}
