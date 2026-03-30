import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import StreamTest from './StreamTest';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StreamTest />
  </StrictMode>,
);
