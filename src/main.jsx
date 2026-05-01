/**
 * main.jsx
 * 
 * This is the very first file that runs when the app starts.
 * It takes our main React component (App) and "renders" (draws) it 
 * onto the webpage inside the HTML element with the id "root".
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Imports our global styles
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Find the root element in index.html and create a React root there
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode helps find bugs by running checks during development
  <React.StrictMode>
    {/* ErrorBoundary catches crashes so the whole app doesn't go blank */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
