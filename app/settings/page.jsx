import ProtectedPage from '../../src/components/ProtectedPage';
import SystemSettingsPage from '../../src/views/SystemSettingsPage';

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SystemSettingsPage />
    </ProtectedPage>
  );
}
