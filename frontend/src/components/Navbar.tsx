import { useNavigate, NavLink } from 'react-router-dom';
import { Headphones, Moon, Sun, LogOut } from 'lucide-react';
import { Role } from '@helpdesk/core';
import { authClient } from '@/lib/auth-client';
import { useDarkMode } from '@/lib/use-dark-mode';

export default function Navbar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { dark, toggle } = useDarkMode();

  async function handleSignOut() {
    await authClient.signOut();
    navigate('/login');
  }

  const isAdmin = (session?.user as { role?: Role } | undefined)?.role === Role.admin;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card/95 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-5">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Headphones className="size-3.5" />
          </div>
          <span className="font-display font-semibold tracking-tight text-foreground">
            Helpdesk
          </span>
        </NavLink>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1">
          <NavLink to="/tickets" className={navLinkClass}>
            Tickets
          </NavLink>
          {isAdmin && (
            <NavLink to="/users" className={navLinkClass}>
              Users
            </NavLink>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <div className="h-5 w-px bg-border" />

        {session?.user.name && (
          <span className="text-sm text-muted-foreground select-none px-1">
            {session.user.name}
          </span>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
