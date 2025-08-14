import React from 'react';
import { 
  LayoutDashboard, 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  FileText, 
  Settings,
  BarChart3,
  Sparkles,
  Hash,
  Menu,
  X
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeView, onViewChange, isOpen, onToggle }) => {
  const menuItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Dashboard overview',
      color: '#3b82f6'
    },
    {
      id: 'emotion',
      label: 'Emotions',
      icon: Brain,
      description: 'Emotion visualizer',
      color: '#8b5cf6'
    },
    {
      id: 'words',
      label: 'Words',
      icon: Hash,
      description: 'Word analysis',
      color: '#10b981'
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: TrendingUp,
      description: 'Sentiment trends',
      color: '#f59e0b'
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: MessageSquare,
      description: 'All reviews',
      color: '#06b6d4'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Export reports',
      color: '#64748b'
    }
  ];

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {/* Removed logo and title - header now serves as spacing */}
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Main</h3>
            {menuItems.slice(0, 5).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => {
                    onViewChange(item.id);
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  title={item.description}
                >
                  <Icon 
                    size={20} 
                    style={{ 
                      color: activeView === item.id ? 'currentColor' : item.color,
                      transition: 'all 0.2s ease'
                    }} 
                  />
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Advanced</h3>
            {menuItems.slice(5, 6).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => {
                    onViewChange(item.id);
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  title={item.description}
                >
                  <Icon 
                    size={20} 
                    style={{ 
                      color: activeView === item.id ? 'currentColor' : item.color,
                      transition: 'all 0.2s ease'
                    }} 
                  />
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item settings">
            <Settings 
              size={20} 
              style={{ 
                color: '#94a3b8',
                transition: 'all 0.2s ease'
              }} 
            />
            <span className="sidebar-item-label">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;