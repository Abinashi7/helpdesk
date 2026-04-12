import { useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  return (
    <nav className="flex h-14 items-center justify-between border-b bg-card px-6">
      <span className="font-semibold">Helpdesk</span>
      <div className="flex items-center gap-4">
        {session?.user.name && (
          <span className="text-sm text-gray-600">{session.user.name}</span>
        )}
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </nav>
  );
}
