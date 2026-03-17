import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import TriggerManager from './pages/TriggerManager';
import WidgetPage from './pages/WidgetPage';
import Layout from './components/Layout';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved dark mode preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return (
    <Router>
      <Routes>
        {/* Widget route - standalone, no layout (Apple-style widget display) */}
        <Route path="/widget" element={<WidgetPage />} />

        {/* App routes - with navigation layout */}
        <Route path="/" element={
          <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
            <Dashboard />
          </Layout>
        } />
        <Route path="/triggers" element={
          <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
            <TriggerManager />
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
