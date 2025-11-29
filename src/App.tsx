import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TeamManagement from './pages/TeamManagement';
import ProjectManagement from './pages/ProjectManagement';
import AllocationPlanning from './pages/AllocationPlanning';
import AllocationRawdata from './pages/AllocationRawdata';
import AllocationCanvas from './pages/AllocationCanvas';
import AllocationHistory from './pages/AllocationHistory';
import CapacityPlanning from './pages/CapacityPlanning';
import RoleManagement from './pages/RoleManagement';
import Setup from './pages/Setup';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <Layout><TeamManagement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/projects" element={
        <ProtectedRoute>
          <Layout><ProjectManagement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/allocations" element={
        <ProtectedRoute>
          <Layout><AllocationPlanning /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/allocations/rawdata" element={
        <ProtectedRoute>
          <Layout><AllocationRawdata /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/allocations/canvas" element={
        <ProtectedRoute>
          <Layout><AllocationCanvas /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <Layout><AllocationHistory /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/capacity-planning" element={
        <ProtectedRoute>
          <Layout><CapacityPlanning /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/roles" element={
        <ProtectedRoute>
          <Layout><RoleManagement /></Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
