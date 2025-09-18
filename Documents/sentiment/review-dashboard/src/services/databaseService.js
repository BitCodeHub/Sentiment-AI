// Database service for Render.com PostgreSQL
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (we'll use Supabase for easier integration with Render)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// For development, we'll use localStorage as fallback
const isProduction = supabaseUrl && supabaseAnonKey;

export const supabase = isProduction ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    if (isProduction && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      return { user: data?.user, error };
    }
    return localDB.createUser(email, password, name);
  },

  async signIn(email, password) {
    if (isProduction && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { user: data?.user, session: data?.session, error };
    }
    return localDB.signIn(email, password);
  },

  async signOut() {
    if (isProduction && supabase) {
      const { error } = await supabase.auth.signOut();
      return { error };
    }
    const session = localStorage.getItem('user_session');
    return localDB.signOut(session);
  },

  async getSession() {
    if (isProduction && supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { session, error };
    }
    const sessionToken = localStorage.getItem('user_session');
    if (!sessionToken) return { user: null, error: 'No session' };
    return localDB.getSession(sessionToken);
  },

  // Guest login
  async signInAsGuest() {
    if (isProduction && supabase) {
      const guestEmail = `guest_${Date.now()}@example.com`;
      const guestPassword = 'guest123';
      const guestName = `Guest User ${Math.floor(Math.random() * 1000)}`;
      
      // For production, create a temporary guest account
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: { name: guestName, isGuest: true }
        }
      });
      return { user: data?.user, session: data?.session, error };
    }
    
    // For local development
    return localDB.signInAsGuest();
  },

  // Review assignments
  async createAssignment(reviewId, assignedToEmail, notes = '') {
    const session = await this.getSession();
    if (!session.user) {
      return { assignment: null, error: 'Not authenticated' };
    }

    if (isProduction && supabase) {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          review_id: reviewId,
          assigned_to: assignedToEmail,
          assigned_by: session.user.email,
          notes,
          status: 'pending'
        })
        .select()
        .single();
      return { assignment: data, error };
    }

    return localDB.createAssignment(reviewId, assignedToEmail, session.user.email, notes);
  },

  async getAssignments(userEmail = null) {
    if (isProduction && supabase) {
      let query = supabase.from('assignments').select('*');
      if (userEmail) {
        query = query.or(`assigned_to.eq.${userEmail},assigned_by.eq.${userEmail}`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      return { assignments: data || [], error };
    }

    return localDB.getAssignments(userEmail);
  },

  async updateAssignmentStatus(assignmentId, status) {
    if (isProduction && supabase) {
      const { data, error } = await supabase
        .from('assignments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .select()
        .single();
      return { assignment: data, error };
    }

    return localDB.updateAssignment(assignmentId, { status });
  },

  // Team members
  async getTeamMembers() {
    if (isProduction && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .order('name');
      return { users: data || [], error };
    }

    return localDB.getAllUsers();
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