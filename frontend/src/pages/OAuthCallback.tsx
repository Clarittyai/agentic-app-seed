import { useEffect, useState } from 'react';

/**
 * OAuth redirect target ({app}/settings/integrations/:service/callback).
 *
 * The provider redirects the popup here with ?code & ?state. This page does NOT
 * call the API itself (the popup has no session) — it relays the code/state to
 * the opener window, which is authenticated and completes the token exchange.
 */
export default function OAuthCallback() {
  const [message, setMessage] = useState('Finishing connection…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'claritty_oauth_callback', code, state, error },
        window.location.origin,
      );
      setMessage(
        error
          ? 'Connection cancelled. You can close this window.'
          : 'Connected! You can close this window.',
      );
      setTimeout(() => window.close(), 800);
    } else {
      setMessage('Please return to the app to finish connecting this integration.');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-accent dark:border-gray-700 dark:border-t-accent" />
        <p className="text-gray-700 dark:text-gray-200">{message}</p>
      </div>
    </div>
  );
}
