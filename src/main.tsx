import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { ColorsProvider } from './contexts/ColorsContext'
import { CLIProvider } from './contexts/CLIContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ColorsProvider>
        <CLIProvider>
          <App />
        </CLIProvider>
      </ColorsProvider>
    </ThemeProvider>
  </StrictMode>,
)
