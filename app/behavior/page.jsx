import ProtectedPage from '../../src/components/ProtectedPage';
import BehaviorScorePage from '../../src/views/BehaviorScorePage';

export default function BehaviorPage() {
  return (
    <ProtectedPage>
      <BehaviorScorePage />
    </ProtectedPage>
  );
}
