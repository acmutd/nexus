import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { initFirebase } from './firebase.js'
import { MobileProvider } from './context/mobileContext.jsx'
import { AuthProvider } from './context/authContext.jsx'

async function bootstrap() {
  try {
    await initFirebase();
  } catch (err) {
    console.error('Error initializing Firebase before app render:', err);
    // continue rendering so UI can show an error state if needed
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MobileProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MobileProvider>
    </StrictMode>,
  )
}

bootstrap();
