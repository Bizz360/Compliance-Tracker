import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { db, subscribeToDatabase } from '../services/database';

interface AuthContextValue {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  switchUser: (userId: string) => void;
  loginAs: (username: string) => boolean;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canAccessAdmin: boolean;
  canAccessEntry: boolean;
  canAccessProcess: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_ACTIVE_USER = 'customsflow_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    // Default to admin or saved user
    const users = db.getProfiles({ id: 'dummy', role: 'ADMIN', username: 'admin', full_name: 'Admin', email: '', status: 'ACTIVE', created_at: '', updated_at: '' });
    const savedId = localStorage.getItem(STORAGE_ACTIVE_USER);
    if (savedId) {
      const match = users.find((u) => u.id === savedId && u.status === 'ACTIVE');
      if (match) return match;
    }
    return users.find((u) => u.role === 'ADMIN') || users[0];
  });

  useEffect(() => {
    const refreshUsers = () => {
      const users = db.getProfiles(currentUser);
      setAvailableUsers(users);
      const updatedCurrent = users.find((u) => u.id === currentUser.id);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
      }
    };

    refreshUsers();
    return subscribeToDatabase(refreshUsers);
  }, [currentUser.id]);

  const switchUser = (userId: string) => {
    const target = availableUsers.find((u) => u.id === userId);
    if (target) {
      if (target.status === 'INACTIVE') {
        alert('Cannot switch to inactive user account.');
        return;
      }
      setCurrentUser(target);
      localStorage.setItem(STORAGE_ACTIVE_USER, target.id);
      db.logAudit(target, 'LOGIN', 'AUTH', target.id, undefined, null, { switchUser: true });
    }
  };

  const loginAs = (username: string): boolean => {
    const target = availableUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim()
    );
    if (target && target.status === 'ACTIVE') {
      setCurrentUser(target);
      localStorage.setItem(STORAGE_ACTIVE_USER, target.id);
      db.logAudit(target, 'LOGIN', 'AUTH', target.id, undefined, null, { username });
      return true;
    }
    return false;
  };

  const logout = () => {
    db.logAudit(currentUser, 'LOGOUT', 'AUTH', currentUser.id);
    // Switch to first available active user or reset
    const teamUser = availableUsers.find((u) => u.role === 'TEAM') || availableUsers[0];
    setCurrentUser(teamUser);
    localStorage.setItem(STORAGE_ACTIVE_USER, teamUser.id);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(currentUser.role);
  };

  const canAccessAdmin = currentUser.role === 'ADMIN';
  const canAccessEntry = ['TEAM', 'PCO', 'ADMIN'].includes(currentUser.role);
  const canAccessProcess = ['HQ', 'ADMIN', 'PCO', 'TEAM'].includes(currentUser.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers,
        switchUser,
        loginAs,
        logout,
        hasRole,
        canAccessAdmin,
        canAccessEntry,
        canAccessProcess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
