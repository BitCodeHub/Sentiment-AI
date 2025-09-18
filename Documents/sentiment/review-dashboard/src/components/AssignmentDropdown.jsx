import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Check, X, ChevronDown, User } from 'lucide-react';
import { db } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import './AssignmentDropdown.css';

const AssignmentDropdown = ({ review, currentAssignment, onAssign }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [notes, setNotes] = useState('');
  const dropdownRef = useRef(null);

  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTeamMembers = async () => {
    try {
      const { users, error } = await db.getTeamMembers();
      if (!error) {
        // Filter out current user and format for display
        const members = users
          .filter(u => u.email !== user?.email)
          .map(u => ({
            email: u.email,
            name: u.name || u.email.split('@')[0],
            initials: (u.name || u.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          }));
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedMember || loading) return;

    setLoading(true);
    try {
      const reviewId = review.id || `${review.date}_${review.author}_${review.rating}`;
      const { assignment, error } = await db.createAssignment(
        reviewId,
        selectedMember.email,
        notes
      );

      if (!error) {
        onAssign && onAssign(assignment);
        setIsOpen(false);
        setSelectedMember(null);
        setNotes('');
        setSearchTerm('');
        
        // Show success message
        showToast(`Review assigned to ${selectedMember.name}`, 'success');
      } else {
        showToast('Failed to assign review', 'error');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      showToast('Failed to assign review', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `assignment-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 10);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="assignment-dropdown" ref={dropdownRef}>
      <button
        className={`assignment-trigger ${currentAssignment ? 'has-assignment' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={currentAssignment ? `Assigned to ${currentAssignment.assignedTo}` : 'Assign to team member'}
      >
        {currentAssignment ? (
          <>
            <User size={14} />
            <span className="assigned-name">
              {currentAssignment.assignedTo.split('@')[0]}
            </span>
          </>
        ) : (
          <>
            <UserPlus size={14} />
            <span>Assign</span>
          </>
        )}
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="assignment-menu">
          <div className="assignment-header">
            <h4>Assign Review</h4>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              <X size={16} />
            </button>
          </div>

          <div className="assignment-search">
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          <div className="team-members-list">
            {filteredMembers.length === 0 ? (
              <p className="no-members">No team members found</p>
            ) : (
              filteredMembers.map(member => (
                <button
                  key={member.email}
                  className={`member-item ${selectedMember?.email === member.email ? 'selected' : ''}`}
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="member-avatar">
                    {member.initials}
                  </div>
                  <div className="member-info">
                    <p className="member-name">{member.name}</p>
                    <p className="member-email">{member.email}</p>
                  </div>
                  {selectedMember?.email === member.email && (
                    <Check size={16} className="check-icon" />
                  )}
                </button>
              ))
            )}
          </div>

          {selectedMember && (
            <>
              <div className="assignment-notes">
                <textarea
                  placeholder="Add notes (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="assignment-actions">
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setNotes('');
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="assign-btn"
                  disabled={loading}
                >
                  {loading ? 'Assigning...' : 'Assign Review'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentDropdown;