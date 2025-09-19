import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Bell, Settings } from 'lucide-react';
import LoginDropdown from './LoginDropdown';
import './UserHeader.css';

const UserHeader = () => {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // If user is not logged in, show LoginDropdown instead
  if (!user) {
    return <LoginDropdown />;
  }

  const getUserInitials = () => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="user-header">
      <div className="user-info">
        <span className="welcome-text">Welcome back,</span>
        <span className="user-name">{user.name || user.email.split('@')[0]}</span>
      </div>

      <div className="header-actions">
        <button className="notification-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-dropdown">
          <button 
            className="user-avatar-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="user-avatar">
              {getUserInitials()}
            </div>
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="user-avatar small">
                  {getUserInitials()}
                </div>
                <div>
                  <p className="dropdown-name">{user.name || 'User'}</p>
                  <p className="dropdown-email">{user.email}</p>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item">
                <Settings size={16} />
                <span>Settings</span>
              </button>

              <button className="dropdown-item" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHeader;