import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Monitoring } from './pages/Monitoring';
import { Faults } from './pages/Faults';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-navy-900 text-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onRefresh={handleRefresh} />
          <main className="flex-1 overflow-y-auto p-6 bg-navy-900">
            <Routes>
              <Route path="/" element={<Dashboard key={`dash-${refreshKey}`} />} />
              <Route path="/devices" element={<Devices key={`dev-${refreshKey}`} />} />
              <Route path="/monitoring" element={<Monitoring key={`mon-${refreshKey}`} />} />
              <Route path="/faults" element={<Faults key={`fault-${refreshKey}`} />} />
              <Route path="/analytics" element={<Analytics key={`anal-${refreshKey}`} />} />
              <Route path="/settings" element={<Settings key={`sett-${refreshKey}`} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
