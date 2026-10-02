import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from './pages/AdminPage';
import { ClientPage } from './pages/ClientPage';
import { EmployeePage } from './pages/EmployeePage';
import { SpacePage } from './pages/SpacePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/borne" replace />} />
        <Route path="/borne" element={<EmployeePage />} />
        <Route path="/client" element={<ClientPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/espace/:token" element={<SpacePage />} />
        <Route path="*" element={<Navigate to="/borne" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
