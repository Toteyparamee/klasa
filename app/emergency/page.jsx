import ProtectedPage from '../../src/components/ProtectedPage';
import EmergencyDashboard from '../../src/views/EmergencyDashboard';

export default function EmergencyPage() {
  return (
    <ProtectedPage>
      <EmergencyDashboard />
    </ProtectedPage>
  );
}
