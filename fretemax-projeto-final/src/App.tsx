import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';

import AppShell from './layouts/AppShell';

import Home from './pages/Home';
import Cliente from './pages/Cliente';
import Motorista from './pages/Motorista';
import Admin from './pages/Admin';

export default function App() {

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell>

          <Routes>

            {/* ======================================================
                HOME
            ====================================================== */}

            <Route
              path="/"
              element={<Home />}
            />

            {/* ======================================================
                CLIENTE
            ====================================================== */}

            <Route
              path="/cliente"
              element={<Cliente />}
            />

            {/* ======================================================
                MOTORISTA
            ====================================================== */}

            <Route
              path="/motorista"
              element={<Motorista />}
            />

            {/* ======================================================
                ADMIN
            ====================================================== */}

            <Route
              path="/admin"
              element={<Admin />}
            />

            {/* ======================================================
                REDIRECTS SEO / ADS
            ====================================================== */}

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
              path="/frete"
              element={
                <Navigate
                  to="/cliente"
                  replace
                />
              }
            />

            <Route
              path="/cargas"
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
              path="/motoristas"
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

            {/* ======================================================
                FALLBACK
            ====================================================== */}

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

        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
