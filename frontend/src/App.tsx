import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setStatus('ok') : setStatus('error')))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Welcome to helpdesk</h1>
      <p className="text-sm">
        Backend:{' '}
        {status === 'loading' && <span className="text-gray-400">checking...</span>}
        {status === 'ok' && <span className="text-green-600">healthy</span>}
        {status === 'error' && <span className="text-red-600">unreachable</span>}
      </p>
    </div>
  );
}
