import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import "./theme.css";

// Global styles
const globalStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: var(--kf-font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--kf-bg-0);
    color: var(--kf-text);
  }

  button {
    font-family: var(--kf-font-body);
  }

  button:hover {
    filter: brightness(1.08);
  }

  button:active {
    transform: translateY(1px) scale(0.98);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    filter: none !important;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes kf-shake {
    0% { transform: translate(0,0) rotate(0); }
    10% { transform: translate(-6px, 4px) rotate(-0.5deg); }
    20% { transform: translate(6px, -4px) rotate(0.5deg); }
    30% { transform: translate(-8px, -2px) rotate(-0.6deg); }
    40% { transform: translate(8px, 2px) rotate(0.6deg); }
    50% { transform: translate(-6px, 4px) rotate(-0.4deg); }
    60% { transform: translate(6px, -4px) rotate(0.4deg); }
    70% { transform: translate(-4px, -2px) rotate(-0.3deg); }
    80% { transform: translate(4px, 2px) rotate(0.3deg); }
    90% { transform: translate(-2px, 1px) rotate(-0.2deg); }
    100% { transform: translate(0,0) rotate(0); }
  }

  @keyframes kf-flash {
    0% { opacity: 0; }
    15% { opacity: 0.85; }
    35% { opacity: 0.1; }
    55% { opacity: 0.6; }
    75% { opacity: 0.0; }
    100% { opacity: 0; }
  }

  @keyframes victoryProgress {
    from { transform: translateX(0%); }
    to { transform: translateX(-100%); }
  }

  @keyframes floatConfetti {
    0%, 100% { transform: translateY(0); opacity: 0.7; }
    50% { transform: translateY(-8px); opacity: 1; }
  }
`;

// Inject global styles
const styleSheet = document.createElement("style");
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// Mount React app
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
