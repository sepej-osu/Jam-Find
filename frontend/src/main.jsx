import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import './index.css'
import App from './App.jsx'
import { Provider } from './components/ui/provider'
import { Toaster } from './components/ui/toaster'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </Provider>
  </StrictMode>
);
