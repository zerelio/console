import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

(async () => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const [{ installDemoInterceptor }, { DEMO_TOKEN, DEMO_USER }] = await Promise.all([
      import('./demo/interceptor'),
      import('./demo/jwt'),
    ]);
    installDemoInterceptor();
    localStorage.setItem('zerelio_at', DEMO_TOKEN);
    localStorage.setItem('zerelio_user', JSON.stringify(DEMO_USER));
  } else {
    const origFetch = window.fetch.bind(window);
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const token = localStorage.getItem('zerelio_at');
      if (!token) return origFetch(input, init);

      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      if (url.includes('/login') || url.includes('/health')) {
        return origFetch(input, init);
      }

      const headers = new Headers(init?.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return origFetch(input, { ...init, headers }).then(res => {
        if (res.status === 401) {
          localStorage.removeItem('zerelio_at');
          localStorage.removeItem('zerelio_user');
          window.location.href = '/login';
        }
        return res;
      });
    };
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
})();
