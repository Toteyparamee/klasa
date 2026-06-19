import ProtectedPage from '../../src/components/ProtectedPage';
import AcademicReportPage from '../../src/views/AcademicReportPage';

export default function AcademicReportPageRoute() {
  return (
    <ProtectedPage>
      <AcademicReportPage />
    </ProtectedPage>
  );
}
