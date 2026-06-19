import ProtectedPage from '../../src/components/ProtectedPage';
import NewsManagementPage from '../../src/views/NewsManagementPage';

export default function NewsPage() {
  return (
    <ProtectedPage>
      <NewsManagementPage />
    </ProtectedPage>
  );
}
