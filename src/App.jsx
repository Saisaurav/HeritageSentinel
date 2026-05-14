import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Artifacts from './pages/Artifacts';
import Map from './pages/Map';
import './index.css';

export default function App() {
  const [assistantText, setAssistantText] = useState(
    'Hello! I am MUSE, your museum guide. Ask me anything about history or explore artifacts.'
  );

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en-US';
  });

  function switchLanguage(lang) {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              assistantText={assistantText}
              setAssistantText={setAssistantText}
              language={language}
              switchLanguage={switchLanguage}
            />
          }
        />
        <Route
          path="/artifacts"
          element={
            <Artifacts
              assistantText={assistantText}
              setAssistantText={setAssistantText}
              language={language}
              switchLanguage={switchLanguage}
            />
          }
        />
        <Route
          path="/map"
          element={
            <Map
              language={language}
              switchLanguage={switchLanguage}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}