import { useEffect } from 'react'
import { useAppSelector } from '../app/store'

/** Has the browser ask before leaving the page while the project has unsaved changes. */
export const useLeavePagePrompt = () => {
  const projectChanged = useAppSelector((state) => state.scratchGui.projectChanged)

  useEffect(() => {
    if (!projectChanged) return
    const prompt = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', prompt)
    return () => window.removeEventListener('beforeunload', prompt)
  }, [projectChanged])
}
