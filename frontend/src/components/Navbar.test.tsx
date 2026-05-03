import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Role } from '@helpdesk/core';
import Navbar from './Navbar';
import { authClient } from '@/lib/auth-client';

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Tickets link', () => {
    it('is visible for an admin user', () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { name: 'Admin User', role: Role.admin } },
        isPending: false,
        error: null,
      } as ReturnType<typeof authClient.useSession>);

      renderNavbar();

      expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument();
    });

    it('is visible for an agent user', () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { name: 'Agent User', role: Role.agent } },
        isPending: false,
        error: null,
      } as ReturnType<typeof authClient.useSession>);

      renderNavbar();

      expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument();
    });
  });

  describe('Users link', () => {
    it('is visible for an admin user', () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { name: 'Admin User', role: Role.admin } },
        isPending: false,
        error: null,
      } as ReturnType<typeof authClient.useSession>);

      renderNavbar();

      expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    });

    it('is not visible for an agent user', () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { name: 'Agent User', role: Role.agent } },
        isPending: false,
        error: null,
      } as ReturnType<typeof authClient.useSession>);

      renderNavbar();

      expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    });
  });
});
