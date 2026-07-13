import ProtectedPage from '../../../../src/components/ProtectedPage';
import NewsRegistrationsPage from '../../../../src/views/NewsRegistrationsPage';

export default function NewsRegistrationsRoute() {
  return (
    <ProtectedPage>
      <NewsRegistrationsPage />
    </ProtectedPage>
  );
}
