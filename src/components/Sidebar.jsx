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
      description: 'Dashboard overview'
    },
    {
      id: 'emotion',
      label: 'Emotions',
      icon: Brain,
      description: 'Emotion visualizer'
    },
    {
      id: 'words',
      label: 'Words',
      icon: Hash,
      description: 'Word analysis'
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: TrendingUp,
      description: 'Sentiment trends'
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: MessageSquare,
      description: 'All reviews'
    },
    {
      id: 'insights',
      label: 'AI Insights',
      icon: Sparkles,
      description: 'AI analysis'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Deep analytics'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Export reports'
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
          <h1 className="sidebar-logo">
            <Brain size={24} />
            <span>Review AI</span>
          </h1>
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
                  <Icon size={18} />
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.id === 'insights' && (
                    <span className="sidebar-badge">AI</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Advanced</h3>
            {menuItems.slice(5).map(item => {
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
                  <Icon size={18} />
                  <span className="sidebar-item-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item settings">
            <Settings size={18} />
            <span className="sidebar-item-label">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;