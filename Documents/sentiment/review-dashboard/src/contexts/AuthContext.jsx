import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/databaseService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { user: sessionUser, error } = await db.getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    setError(null);
    try {
      const { user: newUser, error } = await db.signUp(email, password, name);
      if (error) throw new Error(error.message || error);
      
      // Auto sign in after signup
      const { user: signedInUser, session } = await db.signIn(email, password);
      if (signedInUser) {
        setUser(signedInUser);
        db.saveSession(session);
      }
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    setError(null);
    try {
      const { user: signedInUser, session, error } = await db.signIn(email, password);
      if (error) throw new Error(error);
      
      setUser(signedInUser);
      db.saveSession(session);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signInAsGuest = async () => {
    setError(null);
    try {
      const { user: guestUser, session, error } = await db.signInAsGuest();
      if (error) throw new Error(error);
      
      setUser(guestUser);
      db.saveSession(session);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await db.signOut();
      setUser(null);
      db.clearSession();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInAsGuest,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};