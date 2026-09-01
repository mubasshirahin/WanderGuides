import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import MessagesInbox from '../components/MessagesInbox.jsx';

export default function MessagesPage({ role }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('wg_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Messages"
        description="Chat with your guides and tourists in real time."
      />
      <MessagesInbox currentUser={currentUser} />
    </div>
  );
}
