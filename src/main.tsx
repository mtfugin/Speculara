import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { preloadMotion } from './design-system/motion'

preloadMotion()

// The brand sheet is a reference page (open /?brand). It loads on demand and is not part of the app bundle.
const BrandSheet = lazy(() => import('./design-system/BrandSheet'))
const showBrand = new URLSearchParams(window.location.search).has('brand')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {showBrand ? (
      <Suspense fallback={null}>
        <BrandSheet />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
)
