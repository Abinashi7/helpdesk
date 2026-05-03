import { useNavigate, NavLink } from 'react-router-dom';
import { Role } from '@helpdesk/core';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  const isAdmin = (session?.user as { role?: Role } | undefined)?.role === Role.admin;

  return (
    <nav className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-6">
        <NavLink to="/" className="font-semibold hover:text-foreground/80">Helpdesk</NavLink>
        <NavLink
          to="/tickets"
          className={({ isActive }) =>
            `text-sm ${isActive ? 'text-foreground font-medium' : 'text-gray-500 hover:text-foreground'}`
          }
        >
          Tickets
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `text-sm ${isActive ? 'text-foreground font-medium' : 'text-gray-500 hover:text-foreground'}`
            }
          >
            Users
          </NavLink>
        )}
      </div>
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
