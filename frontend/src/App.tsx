import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import UsersPage from '@/pages/UsersPage';
import Navbar from '@/components/Navbar';

type SessionUser = ReturnType<typeof authClient.useSession>['data'] extends { user: infer U } | null
  ? U & { role: 'admin' | 'agent' }
  : never;

function ProtectedLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function AdminLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const user = session.user as SessionUser;
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route element={<AdminLayout />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
