/** 애플리케이션 진입점 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root 엘리먼트를 찾을 수 없습니다. index.html을 확인하세요.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
