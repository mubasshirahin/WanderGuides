import { LayoutDashboard } from 'lucide-react';
import { ComingSoon } from './GuidesPage.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your travel activity at a glance."
      />
      <ComingSoon
        icon={LayoutDashboard}
        title="Coming Soon"
        message="Analytics, recent activities, and a full profile overview."
      />
    </div>
  );
}