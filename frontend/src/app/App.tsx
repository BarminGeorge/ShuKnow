import { Routes, Route } from "react-router";
import { Provider } from "jotai";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Workspace from "./Workspace";

console.log('[App] Component loaded');

export default function App() {
  console.log('[App] Rendering...');
  return (
    <Provider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Workspace />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Provider>
  );
}
