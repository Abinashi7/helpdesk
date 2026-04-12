import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import Navbar from '@/components/Navbar';

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
