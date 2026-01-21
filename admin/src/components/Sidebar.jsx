import { Activity, Zap, Settings } from 'lucide-react'
import './Sidebar.css'

function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Syntaxial DSI</h1>
        <p className="subtitle">Schema Optimizer</p>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          <Activity size={20} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'sync' ? 'active' : ''}`}
          onClick={() => setCurrentPage('sync')}
        >
          <Zap size={20} />
          <span>Sync Schema</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <small>v0.1.0</small>
      </div>
    </aside>
  )
}

export default Sidebar
