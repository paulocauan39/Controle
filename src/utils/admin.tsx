import React from 'react';
import { Participant, UserRole } from '../types.js';

export type UserLike =
  | Participant
  | {
      id?: string;
      email?: string | null;
      funcao?: UserRole | string;
      role?: string;
      isAdmin?: boolean;
      admin?: boolean;
      roles?: (UserRole | string)[];
    }
  | null
  | undefined;

/**
 * Utility function to check whether a user possesses administrative privileges.
 * Recognizes 'paulocauan39@gmail.com', explicit isAdmin/admin flags, funcao='admin', or 'admin' role.
 */
export function isAdmin(user?: UserLike): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (email === 'paulocauan39@gmail.com') return true;
  if (user.isAdmin === true || (user as any).admin === true) return true;
  if (user.funcao === 'admin' || (user as any).role === 'admin') return true;
  if (Array.isArray(user.roles) && user.roles.includes('admin' as any)) return true;
  return false;
}

/**
 * Higher-Order Component (HOC) that conditionally renders a component only for Admin users.
 */
export function withAdmin<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback: React.ReactNode = null
): React.FC<P & { user?: UserLike }> {
  const WithAdminComponent: React.FC<P & { user?: UserLike }> = (props) => {
    const { user, ...restProps } = props;
    if (!isAdmin(user)) {
      return <>{fallback}</>;
    }
    return <WrappedComponent {...(restProps as P)} />;
  };
  WithAdminComponent.displayName = `WithAdmin(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithAdminComponent;
}

/**
 * Component to conditionally show admin-only control buttons or blocks
 */
export const AdminOnly: React.FC<{
  user?: UserLike;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ user, fallback = null, children }) => {
  if (!isAdmin(user)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
