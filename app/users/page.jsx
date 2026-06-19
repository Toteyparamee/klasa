import ProtectedPage from '../../src/components/ProtectedPage';
import UserManagementPage from '../../src/views/UserManagementPage';

export default function UsersPage() {
  return (
    <ProtectedPage>
      <UserManagementPage />
    </ProtectedPage>
  );
}
