import { Navigate } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const currentUser = useTopicStore(state => state.currentUser);
  const fetchUserData = useTopicStore(state => state.fetchUserData);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser, fetchUserData]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
