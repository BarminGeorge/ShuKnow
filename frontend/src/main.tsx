import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./app/App.tsx";
import "./styles/index.css";

console.log('[Main] Starting app...');
console.log('[Main] VITE_USE_MOCK_AUTH:', import.meta.env.VITE_USE_MOCK_AUTH);

// Enable MSW in development
if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
  console.log('[Main] Loading MSW...');
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
  console.log('[Main] MSW started');
}

console.log('[Main] Rendering app...');
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
console.log('[Main] App rendered');