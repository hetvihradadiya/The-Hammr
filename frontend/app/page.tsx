'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Home() {
  const [result, setResult] = useState('Testing API...');

  useEffect(() => {
    api('/api/v1/auth/me')
      .then((data) => {
        setResult(JSON.stringify(data));
      })
      .catch((error: Error) => {
        setResult(error.message);
      });
  }, []);

  return (
    <main>
      <h1>Hammr API Test</h1>
      <pre>{result}</pre>
    </main>
  );
}
