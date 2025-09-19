// Database service that uses backend API endpoints
// Falls back to localStorage when API is not available

// Check environment
const isProduction = import.meta.env.PROD || false;
const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('review_session_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Local storage fallback for development
class LocalStorageDB {
  constructor() {
    this.users = JSON.parse(localStorage.getItem('review_users') || '[]');
    this.assignments = JSON.parse(localStorage.getItem('review_assignments') || '[]');
    this.sessions = JSON.parse(localStorage.getItem('user_sessions') || '{}');
  }

  saveUsers() {
    localStorage.setItem('review_users', JSON.stringify(this.users));
  }

  saveAssignments() {
    localStorage.setItem('review_assignments', JSON.stringify(this.assignments));
  }

  saveSessions() {
    localStorage.setItem('user_sessions', JSON.stringify(this.sessions));
  }

  async createUser(email, password, name) {
    const existingUser = this.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = {
      id: Date.now().toString(),
      email,
      password: btoa(password), // Simple encoding for demo
      name,
      role: 'member',
      createdAt: new Date().toISOString()
    };

    this.users.push(user);
    this.saveUsers();
    return { user, error: null };
  }

  async signIn(email, password) {
    const user = this.users.find(u => u.email === email && u.password === btoa(password));
    if (!user) {
      return { user: null, error: 'Invalid credentials' };
    }

    const sessionToken = btoa(`${email}:${Date.now()}`);
    this.sessions[sessionToken] = user.id;
    this.saveSessions();
    
    // Save session token to localStorage
    localStorage.setItem('review_session_token', sessionToken);

    return { 
      user: { ...user, password: undefined }, 
      session: sessionToken,
      error: null 
    };
  }

  async signOut(sessionToken) {
    delete this.sessions[sessionToken];
    this.saveSessions();
    localStorage.removeItem('review_session_token');
    return { error: null };
  }

  async signInAsGuest() {
    const guestEmail = `guest_${Date.now()}@example.com`;
    const guestPassword = 'guest123';
    const guestName = `Guest User`;
    
    await this.createUser(guestEmail, guestPassword, guestName);
    return this.signIn(guestEmail, guestPassword);
  }

  async getSession(sessionToken) {
    // If no token provided, check localStorage for current session
    if (!sessionToken) {
      sessionToken = localStorage.getItem('review_session_token');
    }
    
    if (!sessionToken || !this.sessions[sessionToken]) {
      return { user: null, error: 'Invalid session' };
    }

    const userId = this.sessions[sessionToken];
    const user = this.users.find(u => u.id === userId);
    return { 
      user: user ? { ...user, password: undefined } : null, 
      error: user ? null : 'User not found' 
    };
  }

  async createAssignment(reviewId, assignedTo, assignedBy, notes = '') {
    const assignment = {
      id: Date.now().toString(),
      reviewId,
      assignedTo,
      assignedBy,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.assignments.push(assignment);
    this.saveAssignments();
    return { assignment, error: null };
  }

  async getAssignments(userId = null) {
    let filtered = this.assignments;
    if (userId) {
      filtered = filtered.filter(a => a.assignedTo === userId || a.assignedBy === userId);
    }
    return { assignments: filtered, error: null };
  }

  async updateAssignment(id, updates) {
    const index = this.assignments.findIndex(a => a.id === id);
    if (index === -1) {
      return { assignment: null, error: 'Assignment not found' };
    }

    this.assignments[index] = {
      ...this.assignments[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveAssignments();
    return { assignment: this.assignments[index], error: null };
  }

  async getAllUsers() {
    return { 
      users: this.users.map(u => ({ ...u, password: undefined })), 
      error: null 
    };
  }
}

// Export database interface
const localDB = new LocalStorageDB();

export const db = {
  // User authentication
  async signUp(email, password, name) {
    try {
      const response = await apiCall('/auth/signup', 'POST', { email, password, name });
      if (response.session?.access_token) {
        localStorage.setItem('review_session_token', response.session.access_token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
      return { user: response.user, error: null };
    } catch (error) {
      console.log('API signup failed, falling back to localStorage');
      return localDB.createUser(email, password, name);
    }
  },

  async signIn(email, password) {
    try {
      const response = await apiCall('/auth/signin', 'POST', { email, password });
      if (response.session?.access_token) {
        localStorage.setItem('review_session_token', response.session.access_token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
      return { user: response.user, error: null };
    } catch (error) {
      console.log('API signin failed, falling back to localStorage');
      return localDB.signIn(email, password);
    }
  },

  async signOut() {
    try {
      await apiCall('/auth/signout', 'POST');
      localStorage.removeItem('review_session_token');
      localStorage.removeItem('current_user');
      return { error: null };
    } catch (error) {
      console.log('API signout failed, clearing local session');
      const session = localStorage.getItem('user_session');
      return localDB.signOut(session);
    }
  },

  async getSession() {
    try {
      const response = await apiCall('/auth/session');
      return { user: response.user, error: null };
    } catch (error) {
      console.log('API session check failed, falling back to localStorage');
      const sessionToken = localStorage.getItem('review_session_token');
      if (!sessionToken) return { user: null, error: 'No session' };
      return localDB.getSession(sessionToken);
    }
  },

  // Guest login
  async signInAsGuest() {
    try {
      const response = await apiCall('/auth/signin-guest', 'POST');
      if (response.session?.access_token) {
        localStorage.setItem('review_session_token', response.session.access_token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
      }
      return { user: response.user, error: null };
    } catch (error) {
      console.log('API guest signin failed, falling back to localStorage');
      return localDB.signInAsGuest();
    }
  },

  // Review assignments
  async createAssignment(reviewId, assignedToEmail, notes = '') {
    try {
      const response = await apiCall('/assignments', 'POST', {
        reviewId,
        assignedToEmail,
        notes
      });
      return { assignment: response.assignment, error: null };
    } catch (error) {
      console.log('API assignment creation failed, falling back to localStorage');
      const session = await this.getSession();
      if (!session.user) {
        return { assignment: null, error: 'Not authenticated' };
      }
      return localDB.createAssignment(reviewId, assignedToEmail, session.user.email, notes);
    }
  },

  async getAssignments(userEmail = null) {
    try {
      const params = userEmail ? `?assignedTo=${userEmail}` : '';
      const response = await apiCall(`/assignments${params}`);
      return { assignments: response.assignments, error: null };
    } catch (error) {
      console.log('API get assignments failed, falling back to localStorage');
      return localDB.getAssignments(userEmail);
    }
  },

  async updateAssignmentStatus(assignmentId, status) {
    try {
      const response = await apiCall(`/assignments/${assignmentId}`, 'PATCH', { status });
      return { assignment: response.assignment, error: null };
    } catch (error) {
      console.log('API update assignment failed, falling back to localStorage');
      return localDB.updateAssignment(assignmentId, { status });
    }
  },

  // Team members
  async getTeamMembers() {
    try {
      const response = await apiCall('/auth/users');
      return { users: response.users, error: null };
    } catch (error) {
      console.log('API get team members failed, falling back to localStorage');
      return localDB.getAllUsers();
    }
  },

  // Save session to localStorage
  saveSession(session) {
    if (session) {
      // Store the session token for localStorage-based auth
      localStorage.setItem('review_session_token', session.access_token || session);
      localStorage.setItem('user_session', session.access_token || session);
      if (session.user) {
        localStorage.setItem('current_user', JSON.stringify(session.user));
      }
    }
  },

  // Clear session from localStorage
  clearSession() {
    localStorage.removeItem('review_session_token');
    localStorage.removeItem('user_session');
    localStorage.removeItem('current_user');
  },

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('current_user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

// Initialize sample users for development
if (!isProduction) {
  const sampleUsers = [
    { email: 'admin@example.com', password: 'admin123', name: 'Admin User' },
    { email: 'john@example.com', password: 'john123', name: 'John Doe' },
    { email: 'jane@example.com', password: 'jane123', name: 'Jane Smith' },
    { email: 'mike@example.com', password: 'mike123', name: 'Mike Johnson' }
  ];

  // Create sample users if they don't exist
  sampleUsers.forEach(async (user) => {
    try {
      await localDB.createUser(user.email, user.password, user.name);
    } catch (e) {
      // User already exists, ignore
    }
  });
}