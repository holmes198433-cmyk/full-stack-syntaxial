import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import '../styles/Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    lastSync: null,
    totalSchemas: 0,
    syncStatus: 'idle',
    lastError: null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      // Placeholder - would fetch actual stats from backend
      setStats({
        lastSync: new Date().toISOString(),
        totalSchemas: 0,
        syncStatus: 'ready',
        lastError: null
      })
    } catch (error) {
      setStats(prev => ({ ...prev, lastError: error.message }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-secondary" onClick={loadStats}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}>
              <CheckCircle size={24} color="#1e40af" />
            </div>
            <div className="stat-content">
              <h3>Total Schemas</h3>
              <p className="stat-value">{stats.totalSchemas}</p>
              <small>Metafield definitions synced</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <RefreshCw size={24} color="#d97706" />
            </div>
            <div className="stat-content">
              <h3>Sync Status</h3>
              <p className="stat-value" style={{ textTransform: 'capitalize' }}>
                {stats.syncStatus}
              </p>
              <small>Ready to sync</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7' }}>
              <CheckCircle size={24} color="#16a34a" />
            </div>
            <div className="stat-content">
              <h3>Last Sync</h3>
              <p className="stat-value">
                {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}
              </p>
              <small>Previous synchronization</small>
            </div>
          </div>
        </div>
      )}

      {stats.lastError && (
        <div className="error-box">
          <AlertCircle size={20} />
          <div>
            <h4>Error</h4>
            <p>{stats.lastError}</p>
          </div>
        </div>
      )}

      <div className="info-section">
        <h2>About Syntaxial</h2>
        <p>
          Syntaxial is a Shopify SEO optimization platform that manages your product metafield schemas.
          Use the <strong>Sync Schema</strong> page to fetch the latest metafield definitions from your Shopify store.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
