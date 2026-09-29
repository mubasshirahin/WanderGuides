import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import MessagesInbox from '../components/MessagesInbox.jsx';

export default function MessagesPage({ role }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const stored = sessionStorage.getItem('wg_user');
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
      <MessagesInbox currentUser={currentUser} initialConversationId={searchParams.get('conversation')} />
    </div>
  );
}
