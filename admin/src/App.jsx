import { useState, useEffect } from 'react'
import { Activity, SettingsIcon, Zap, AlertCircle } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SchemaSync from './pages/SchemaSync'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check server health on load
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/v1/dsi/pulse')
      if (!response.ok) throw new Error('Server unavailable')
      setError(null)
    } catch (err) {
      setError('Cannot connect to Syntaxial server')
    }
  }

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'sync' && <SchemaSync />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="page">
      <h1>Settings</h1>
      <p>Configure Syntaxial integration settings here.</p>
    </div>
  )
}

export default App
