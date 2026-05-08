import { useState, useCallback, useRef } from 'react';
import {
  INITIAL_REGISTERS,
  INITIAL_FLAGS,
  createInitialMemory,
  toHex
} from '../data/cpu8085';

// Input modes for the keypad
export const INPUT_MODE = {
  ADDRESS: 'ADDRESS', // entering an address
  DATA: 'DATA',       // entering a data byte
  IDLE: 'IDLE',
};

// Trainer function modes
export const TRAINER_MODE = {
  MONITOR: 'MONITOR',
  EXAMINE_MEM: 'EXAMINE_MEM',
  EXAMINE_REG: 'EXAMINE_REG',
};

export default function use8085() {
  const [registers, setRegisters] = useState(INITIAL_REGISTERS);
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const memRef = useRef(createInitialMemory());
  const [memDisplay, setMemDisplay] = useState(Array(16).fill(0));
  const [memBaseAddr, setMemBaseAddr] = useState(0x2000);

  // Display state
  // addressDisplay: 4 hex chars  (e.g. "2000")
  // dataDisplay:    2 hex chars  (e.g. "FF")
  const [addressDisplay, setAddressDisplay] = useState('----');
  const [dataDisplay, setDataDisplay] = useState('--');
  const [displayBlink, setDisplayBlink] = useState(false);

  // Input buffer
  const [inputBuffer, setInputBuffer] = useState('');
  const [inputMode, setInputMode] = useState(INPUT_MODE.IDLE);
  const [trainerMode, setTrainerMode] = useState(TRAINER_MODE.MONITOR);

  // Current address pointer
  const [currentAddr, setCurrentAddr] = useState(0x2000);

  // Shifted state (for SHIFT key)
  const [shifted, setShifted] = useState(false);

  // Log
  const [log, setLog] = useState([]);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-99), `> ${msg}`]);
  }, []);

  const refreshMemDisplay = useCallback((base) => {
    const slice = [];
    for (let i = 0; i < 16; i++) {
      slice.push(memRef.current[(base + i) & 0xFFFF]);
    }
    setMemDisplay(slice);
  }, []);

  // ---- RESET ----
  const handleReset = useCallback(() => {
    setRegisters(INITIAL_REGISTERS);
    setFlags(INITIAL_FLAGS);
    setAddressDisplay('----');
    setDataDisplay('--');
    setInputBuffer('');
    setInputMode(INPUT_MODE.IDLE);
    setTrainerMode(TRAINER_MODE.MONITOR);
    setShifted(false);
    addLog('System RESET');
  }, [addLog]);

  // ---- MEM (Examine Memory) ----
  const handleMem = useCallback(() => {
    setTrainerMode(TRAINER_MODE.EXAMINE_MEM);
    setInputMode(INPUT_MODE.ADDRESS);
    setInputBuffer('');
    setAddressDisplay('    ');
    setDataDisplay('--');
    addLog('MEM: Enter address');
  }, [addLog]);

  // ---- EXREG (Examine Register) ----
  const handleExReg = useCallback(() => {
    setTrainerMode(TRAINER_MODE.EXAMINE_REG);
    setInputMode(INPUT_MODE.IDLE);
    setAddressDisplay('A   ');
    setDataDisplay(toHex(registers.A));
    addLog('EXREG: Showing A=' + toHex(registers.A));
  }, [addLog, registers.A]);

  // ---- NEXT ----
  const handleNext = useCallback(() => {
    if (trainerMode === TRAINER_MODE.EXAMINE_MEM) {
      // Save current data if we were editing
      const nextAddr = (currentAddr + 1) & 0xFFFF;
      setCurrentAddr(nextAddr);
      setAddressDisplay(toHex(nextAddr, 4));
      setDataDisplay(toHex(memRef.current[nextAddr]));
      setInputBuffer('');
      setInputMode(INPUT_MODE.DATA);
      addLog(`NEXT: ${toHex(nextAddr, 4)} = ${toHex(memRef.current[nextAddr])}`);
      refreshMemDisplay(memBaseAddr);
    }
  }, [trainerMode, currentAddr, memBaseAddr, addLog, refreshMemDisplay]);

  // ---- Hex digit input ----
  const handleHexKey = useCallback((digit) => {
    if (inputMode === INPUT_MODE.IDLE) return;

    const maxLen = inputMode === INPUT_MODE.ADDRESS ? 4 : 2;
    const newBuf = (inputBuffer + digit).slice(-maxLen);
    setInputBuffer(newBuf);

    if (inputMode === INPUT_MODE.ADDRESS) {
      setAddressDisplay(newBuf.padStart(4, '-'));
    } else {
      setDataDisplay(newBuf.padStart(2, '-'));
    }
  }, [inputMode, inputBuffer]);

  // ---- Enter/confirm address ----
  const confirmAddress = useCallback(() => {
    if (inputBuffer.length === 0) return;
    const addr = parseInt(inputBuffer, 16) & 0xFFFF;
    setCurrentAddr(addr);
    setMemBaseAddr(addr);
    setAddressDisplay(toHex(addr, 4));
    setDataDisplay(toHex(memRef.current[addr]));
    setInputBuffer('');
    setInputMode(INPUT_MODE.DATA);
    refreshMemDisplay(addr);
    addLog(`MEM: ${toHex(addr, 4)} = ${toHex(memRef.current[addr])}`);
  }, [inputBuffer, refreshMemDisplay, addLog]);

  // ---- Write data byte ----
  const confirmData = useCallback(() => {
    if (inputBuffer.length === 0) return;
    const value = parseInt(inputBuffer, 16) & 0xFF;
    memRef.current[currentAddr] = value;
    setDataDisplay(toHex(value));
    setInputBuffer('');
    refreshMemDisplay(memBaseAddr);
    addLog(`WRITE: [${toHex(currentAddr, 4)}] = ${toHex(value)}`);
  }, [inputBuffer, currentAddr, memBaseAddr, refreshMemDisplay, addLog]);

  // ---- FILL ----
  const handleFill = useCallback((fromAddr, toAddr, fillByte) => {
    const f = fromAddr & 0xFFFF;
    const t = toAddr & 0xFFFF;
    const b = fillByte & 0xFF;
    for (let a = f; a <= t; a++) {
      memRef.current[a] = b;
    }
    refreshMemDisplay(memBaseAddr);
    addLog(`FILL: ${toHex(f, 4)}–${toHex(t, 4)} with ${toHex(b)}`);
  }, [memBaseAddr, refreshMemDisplay, addLog]);

  // ---- GO (Execute) ----
  const handleGo = useCallback(() => {
    addLog(`GO: Executing from ${toHex(registers.PC, 4)}`);
    setAddressDisplay(toHex(registers.PC, 4));
    setDataDisplay('--');
  }, [registers.PC, addLog]);

  // Master key handler
  const handleKey = useCallback((keyId) => {
    switch (keyId) {
      case 'RESET':     handleReset(); break;
      case 'MEM':       handleMem(); break;
      case 'NEXT':      handleNext(); break;
      case 'EXREG_SI':  handleExReg(); break;
      case 'GO':        handleGo(); break;
      case 'SHIFT':     setShifted(s => !s); break;

      case '0': case '1': case '2': case '3':
      case '4': case '5': case '6': case '7':
      case '8': case '9': case 'A': case 'B':
      case 'C': case 'D': case 'E': case 'F':
        if (inputMode !== INPUT_MODE.IDLE) {
          handleHexKey(keyId);
        }
        break;

      default: break;
    }
  }, [handleReset, handleMem, handleNext, handleExReg, handleGo, handleHexKey, inputMode]);

  // Confirm current input (called by pressing NEXT after address entry)
  const confirmInput = useCallback(() => {
    if (inputMode === INPUT_MODE.ADDRESS) confirmAddress();
    else if (inputMode === INPUT_MODE.DATA) confirmData();
  }, [inputMode, confirmAddress, confirmData]);

  return {
    registers, setRegisters,
    flags, setFlags,
    memory: memRef.current,
    memDisplay, memBaseAddr, setMemBaseAddr, refreshMemDisplay,
    addressDisplay, dataDisplay, displayBlink,
    inputMode, trainerMode, shifted,
    currentAddr,
    log,
    handleKey,
    confirmInput,
    handleFill,
  };
}
