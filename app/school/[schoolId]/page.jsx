import ProtectedPage from '../../../src/components/ProtectedPage';
import SchoolDetail from '../../../src/views/SchoolDetail';

export default function SchoolDetailPage() {
  return (
    <ProtectedPage>
      <SchoolDetail />
    </ProtectedPage>
  );
}
