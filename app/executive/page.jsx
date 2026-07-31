import ProtectedPage from '../../src/components/ProtectedPage';
import ExecutiveDashboard from '../../src/views/ExecutiveDashboard';

export default function ExecutivePage() {
  return (
    <ProtectedPage>
      <ExecutiveDashboard />
    </ProtectedPage>
  );
}
