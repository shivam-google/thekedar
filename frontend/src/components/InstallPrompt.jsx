import { useEffect, useState } from 'react'
import { Icon } from './Icons'

function isIOSDevice() {
  const userAgent = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsIOS(isIOSDevice())
    setInstalled(isInstalled())

    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallEvent(event)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
      setShowInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (installed || (!installEvent && !isIOS)) return null

  const handleClick = async () => {
    setError('')
    if (!installEvent) {
      setShowInstructions((visible) => !visible)
      return
    }

    const promptEvent = installEvent
    setInstallEvent(null)
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
    } catch (promptError) {
      console.error('TheKedar installation prompt failed:', promptError)
      setError('The install prompt could not be opened. Try again from your browser menu.')
    }
  }

  return (
    <div className="install-prompt">
      <button
        type="button"
        className="button button-small install-button"
        onClick={handleClick}
        aria-expanded={showInstructions}
        aria-haspopup={isIOS ? 'dialog' : undefined}
      >
        <Icon name="download" size={16} />
        Install TheKedar
      </button>
      {showInstructions && isIOS && (
        <div className="install-instructions" role="dialog" aria-label="Install TheKedar on iPhone or iPad">
          <strong>Add TheKedar to your Home Screen</strong>
          <p>In Safari, tap Share, choose “Add to Home Screen,” then tap Add.</p>
          <button type="button" className="install-instructions-close" onClick={() => setShowInstructions(false)}>Got it</button>
        </div>
      )}
      {error && <span className="install-error" role="status">{error}</span>}
    </div>
  )
}
