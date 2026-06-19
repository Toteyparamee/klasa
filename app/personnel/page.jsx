import ProtectedPage from '../../src/components/ProtectedPage';
import PersonnelManagementPage from '../../src/views/PersonnelManagementPage';

export default function PersonnelPage() {
  return (
    <ProtectedPage>
      <PersonnelManagementPage />
    </ProtectedPage>
  );
}
