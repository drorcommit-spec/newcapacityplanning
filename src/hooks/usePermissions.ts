import { useAuth } from '../context/AuthContext';
import { getUserPermissions } from '../types';

export function usePermissions() {
  const { user } = useAuth();
  
  const hasWritePermission = () => {
    if (!user) return false;
    return getUserPermissions(user.role).includes('write');
  };

  const hasReadPermission = () => {
    if (!user) return false;
    return getUserPermissions(user.role).includes('read');
  };

  return {
    canWrite: hasWritePermission(),
    canRead: hasReadPermission(),
  };
}
