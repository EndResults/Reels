import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ToastProvider } from './components/ToastProvider'
import './i18n'

if (import.meta.env.MODE !== 'production') {
  console.log('🌐 API Base:', import.meta.env.VITE_API_URL);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
