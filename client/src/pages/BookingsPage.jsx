import { CalendarDays } from 'lucide-react';
import { ComingSoon } from './GuidesPage.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function BookingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Your adventures"
        title="My Bookings"
        description="Keep track of your upcoming tours and past adventures."
      />
      <ComingSoon
        icon={CalendarDays}
        title="Coming Soon"
        message="Manage your hired guides, schedules, and tour confirmations."
      />
    </div>
  );
}