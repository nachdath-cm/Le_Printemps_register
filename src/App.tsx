import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from './pages/AdminPage';
import { AccueilClientPage } from './pages/AccueilClientPage';
import { EmployeePage } from './pages/EmployeePage';
import { SpacePage } from './pages/SpacePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/borne" replace />} />
        <Route path="/borne" element={<EmployeePage />} />
        <Route path="/client" element={<Navigate to="/accueil-client" replace />} />
        <Route path="/accueil-client" element={<AccueilClientPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/espace" element={<SpacePage />} />
        <Route path="/espace/:token" element={<Navigate to="/accueil-client" replace />} />
        <Route path="*" element={<Navigate to="/borne" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
