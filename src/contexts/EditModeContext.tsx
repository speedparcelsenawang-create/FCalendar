import { createContext, useContext, useState, ReactNode } from "react"

interface EditModeContextType {
  isEditMode: boolean
  hasUnsavedChanges: boolean
  setIsEditMode: (value: boolean) => void
  setHasUnsavedChanges: (value: boolean) => void
  saveChanges: () => void
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined)

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const saveChanges = () => {
    setHasUnsavedChanges(false)
    // Additional save logic can be added here if needed
  }

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        hasUnsavedChanges,
        setIsEditMode,
        setHasUnsavedChanges,
        saveChanges,
      }}
    >
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (context === undefined) {
    // Return default values if used outside provider instead of throwing error
    return {
      isEditMode: false,
      hasUnsavedChanges: false,
      setIsEditMode: () => {},
      setHasUnsavedChanges: () => {},
      saveChanges: () => {},
    }
  }
  return context
}
