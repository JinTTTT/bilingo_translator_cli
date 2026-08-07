import React from 'react';
import ReactDOM from 'react-dom/client';

import TranslationWindow from './components/TranslationWindow.jsx';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TranslationWindow />
  </React.StrictMode>,
);
