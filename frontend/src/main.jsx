import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter} from 'react-router-dom'
import StoreContextProvider from './context/StoreContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <StoreContextProvider>
        <App />
    </StoreContextProvider>
  
  </BrowserRouter>,
)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Elevoni service worker registration failed:", error);
    });
  });
}