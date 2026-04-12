import { useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';

export default function Navbar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <nav className="flex h-14 items-center justify-between border-b px-6">
      <span className="font-semibold">Helpdesk</span>
      <div className="flex items-center gap-4">
        {session?.user.name && (
          <span className="text-sm text-gray-600">{session.user.name}</span>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
