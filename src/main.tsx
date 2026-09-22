import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './lib/cart'
import { resumeCheckout } from './lib/checkout'
import './styles/global.css'

// Runs before React so the bag is read after any checkout bookkeeping, not before.
const resume = resumeCheckout()

const app = (
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CartProvider>
        <App resume={resume} />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>
)

// Published pages arrive prerendered, so hydrate the HTML that is already there. The dev server serves an empty root.
const container = document.getElementById('root')!
if (container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
