import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import IntegrationsSettings from './pages/IntegrationsSettings';
import OAuthCallback from './pages/OAuthCallback';
import WidgetPage from './pages/WidgetPage';
import Layout from './components/Layout';
import { useClarittyTheme } from './hooks/useClarittyTheme';

function App() {
  // Theme is inherited from the host (URL param + postMessage), falling back to
  // the OS preference when running standalone. No in-app toggle.
  useClarittyTheme();

  return (
    <Router>
      <Routes>
        {/* Widget route — standalone, no layout (Apple-style widget display). */}
        <Route path="/widget" element={<WidgetPage />} />

        {/* OAuth popup target — no layout (it relays the code to the opener). */}
        <Route path="/settings/integrations/:service/callback" element={<OAuthCallback />} />

        {/* App routes — with the navigation layout. */}
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
        <Route path="/integrations" element={<Layout><IntegrationsSettings /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;
