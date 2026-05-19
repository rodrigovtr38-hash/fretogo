import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';

import ErrorBoundary from './components/ErrorBoundary';

import AppLayout from './layouts/AppLayout';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout>
          <Routes>

            {/* HOME */}
            <Route
              path="/"
              element={<Home />}
            />

            {/* CLIENTE */}
            <Route
              path="/cliente"
              element={<Cliente />}
            />

            {/* MOTORISTA */}
            <Route
              path="/motorista"
              element={<Motorista />}
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={<Admin />}
            />

            {/* REDIRECTS */}
            <Route
              path="/contratar"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/simular"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/parceiros"
              element={
                <Navigate
                  to="/motorista"
                  replace
                />
              }
            />

            <Route
              path="/radar"
              element={
                <Navigate
                  to="/motorista"
                  replace
                />
              }
            />

            {/* FALLBACK */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>
        </AppLayout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
