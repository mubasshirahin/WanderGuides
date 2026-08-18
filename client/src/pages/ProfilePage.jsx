import { UserCircle } from 'lucide-react';
import { ComingSoon } from './GuidesPage.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function ProfilePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Personalize"
        title="Profile Settings"
        description="Make your profile stand out to travelers."
      />
      <ComingSoon
        icon={UserCircle}
        title="Coming Soon"
        message="Update your bio, expert areas, and availability."
      />
    </div>
  );
}