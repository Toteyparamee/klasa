import ProtectedPage from '../../src/components/ProtectedPage';
import AdminDashboard from '../../src/views/AdminDashboard';

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <AdminDashboard />
    </ProtectedPage>
  );
}
