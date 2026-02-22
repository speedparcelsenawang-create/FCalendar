import { createContext, useContext, useState, useRef, type ReactNode } from "react"
import { toast } from "sonner"

interface EditModeContextType {
  isEditMode: boolean
  hasUnsavedChanges: boolean
  isSaving: boolean
  setIsEditMode: (value: boolean) => void
  setHasUnsavedChanges: (value: boolean) => void
  saveChanges: () => void
  registerSaveHandler: (handler: () => Promise<void>) => void
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined)

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null)

  const registerSaveHandler = (handler: () => Promise<void>) => {
    saveHandlerRef.current = handler
  }

  const saveChanges = async () => {
    if (saveHandlerRef.current) {
      setIsSaving(true)
      try {
        await saveHandlerRef.current()
        setHasUnsavedChanges(false)
        toast.success('Saved successfully!')
      } catch (e) {
        toast.error('Save failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
      } finally {
        setIsSaving(false)
      }
    } else {
      setHasUnsavedChanges(false)
    }
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
      }}
    >
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
    }
  }
  return context
}
