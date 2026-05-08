import React, { useState, useEffect, useRef, useCallback } from 'react';
import TrainerBoard from './components/TrainerBoard';
import SidePanel, { ICInfoModal } from './components/SidePanel';
import use8085 from './hooks/use8085';
import { IC_INFO } from './data/cpu8085';
import './App.css';

// Keyboard shortcut mapping
const KEYBOARD_MAP = {
  'Escape': 'RESET',
  '0': '0', '1': '1', '2': '2', '3': '3',
  '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9',
  'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F',
  'g': 'GO', 'G': 'GO',
  'n': 'MEMC_NEXT', 'N': 'MEMC_NEXT',
  'm': 'BM', 'M': 'BM',
  'x': 'EXREG_SI', 'X': 'EXREG_SI',
  'i': 'INS_DATA', 'I': 'INS_DATA',
  'r': 'REL_EXMEM', 'R': 'REL_EXMEM',
  's': 'STRING_PRE', 'S': 'STRING_PRE',
  '+': 'FILL',
  'v': 'VCT_INT', 'V': 'VCT_INT',
  'Delete': 'DEL_DATA',
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [scale, setScale] = useState(1);
  const [icInfoKey, setIcInfoKey] = useState(null);
  const prevRegisters = useRef(null);
  const containerRef = useRef(null);

  const {
    registers, flags,
    memory, memDisplay, memBaseAddr, setMemBaseAddr, refreshMemDisplay,
    addressDisplay, dataDisplay,
    shifted, log,
    handleKey,
  } = use8085();

  // ---- Responsive scaling ----
  useEffect(() => {
    const update = () => {
      const boardW = 860 + 300; // board + sidebar
      const vw = window.innerWidth - 40;
      const s = Math.min(1, vw / boardW);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ---- Theme ----
  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't fire if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const mapped = KEYBOARD_MAP[e.key];
      if (mapped) {
        e.preventDefault();
        handleKey(mapped);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  // ---- IC chip info click ----
  const handleChipInfo = useCallback((chipLabel) => {
    // Normalize chip label to IC_INFO key
    const key = Object.keys(IC_INFO).find(k =>
      chipLabel.includes(k) || k.includes(chipLabel)
    );
    setIcInfoKey(key || null);
  }, []);

  const icInfoData = icInfoKey ? IC_INFO[icInfoKey] : null;

  return (
    <div className="app-shell">
      {/* ---- Page header ---- */}
      <header className="app-header">
        <div className="app-logo">
          <span className="logo-chip">🔲</span>
          <span className="logo-title">8085 Trainer Kit Simulator</span>
        </div>
        <div className="header-badges">
          <span className="badge badge-green">Phase 1</span>
          <span className="badge badge-blue">Digital Twin</span>
        </div>
        <nav className="header-nav">
          <a href="#" className="nav-link">Docs</a>
          <a href="#" className="nav-link">Sample Programs</a>
          <a href="#" className="nav-link">Help</a>
        </nav>
      </header>

      {/* ---- Main workspace ---- */}
      <main className="workspace">
        <div
          className="board-scale-wrapper"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          ref={containerRef}
        >
          <div className="workspace-inner">
            {/* The trainer board */}
            <TrainerBoard
              addressDisplay={addressDisplay}
              dataDisplay={dataDisplay}
              onKey={handleKey}
              shifted={shifted}
              onChipInfo={handleChipInfo}
            />

            {/* Side panel */}
            <SidePanel
              registers={registers}
              prevRegisters={prevRegisters.current}
              flags={flags}
              memory={memory}
              memDisplay={memDisplay}
              memBaseAddr={memBaseAddr}
              setMemBaseAddr={setMemBaseAddr}
              refreshMemDisplay={refreshMemDisplay}
              log={log}
              theme={theme}
              onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            />
          </div>
        </div>

        {/* Keyboard shortcut hint bar */}
        <div className="hint-bar">
          <span className="hint-item"><kbd>0–9 A–F</kbd> Hex input</span>
          <span className="hint-item"><kbd>G</kbd> GO</span>
          <span className="hint-item"><kbd>Esc</kbd> RESET</span>
          <span className="hint-item"><kbd>X</kbd> EXREG</span>
          <span className="hint-item"><kbd>N</kbd> NEXT</span>
          <span className="hint-item"><kbd>I</kbd> INS DATA</span>
          <span className="hint-item"><kbd>Del</kbd> DEL DATA</span>
          <span className="hint-item">💡 Click any IC chip for info</span>
        </div>
      </main>

      {/* ---- IC Info Modal ---- */}
      {icInfoData && (
        <ICInfoModal info={icInfoData} onClose={() => setIcInfoKey(null)} />
      )}
    </div>
  );
}
