import { useState } from 'react'
import { Zap, AlertCircle, CheckCircle } from 'lucide-react'
import '../styles/SchemaSync.css'

function SchemaSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      setError(null)
      setSyncResult(null)

      const response = await fetch('/admin/sync-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In production, use proper authentication (Shopify session or DSI_MASTER_KEY)
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      setSyncResult({
        status: data.status,
        message: data.message,
        count: data.count || 0
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="page schema-sync-page">
      <div className="page-header">
        <h1>Schema Synchronization</h1>
        <p className="subtitle">
          Sync metafield definitions from your Shopify store to Syntaxial
        </p>
      </div>

      <div className="sync-card">
        <div className="sync-header">
          <Zap size={28} color="#3b82f6" />
          <h2>Sync Metafield Definitions</h2>
        </div>

        <div className="sync-description">
          <p>
            This will fetch all product metafield definitions from your Shopify store
            and update the local database. This process:
          </p>
          <ul>
            <li>Queries Shopify GraphQL API for metafield definitions</li>
            <li>Batches updates to avoid database limits</li>
            <li>Maintains a historical record of schema changes</li>
            <li>Takes 5-30 seconds depending on your store size</li>
          </ul>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Start Sync'}
        </button>

        {syncResult && (
          <div className="result-box success">
            <CheckCircle size={20} />
            <div>
              <h4>{syncResult.message}</h4>
              {syncResult.count > 0 && (
                <p>{syncResult.count} metafield definitions synced</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="result-box error">
            <AlertCircle size={20} />
            <div>
              <h4>Sync Failed</h4>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="info-section">
        <h3>How It Works</h3>
        <div className="info-grid">
          <div className="info-item">
            <h4>1. GraphQL Query</h4>
            <p>Fetches up to 250 metafield definitions per request from Shopify</p>
          </div>
          <div className="info-item">
            <h4>2. Data Validation</h4>
            <p>Validates schema integrity and checks for duplicate definitions</p>
          </div>
          <div className="info-item">
            <h4>3. Database Update</h4>
            <p>Upserts records in 50-record chunks using Prisma transactions</p>
          </div>
          <div className="info-item">
            <h4>4. Audit Trail</h4>
            <p>Records sync timestamp for compliance and debugging</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchemaSync
