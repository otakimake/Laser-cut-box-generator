/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PanelData, computeNesting, getRotatedPointsAndHoles } from '../lib/boxGeometry';
import { Layers, RotateCcw, Sliders, LayoutGrid, Download, Scissors, Check, Eye, Send, User, Mail, MessageSquare } from 'lucide-react';

interface FlatSheetLayoutProps {
  panels: PanelData[];
  spacing: number;
  sheetWidth: number;
  sheetHeight: number;
  onSheetWidthChange: (w: number) => void;
  onSheetHeightChange: (h: number) => void;
  onExportSVG?: () => void;
  onExportDXF?: () => void;
  onSendToStaff?: (senderName: string, senderEmail: string, notes: string) => void;
}

const PRESETS = [
  { name: 'K40 / Mini Craft (300×200)', w: 300, h: 200, icon: '📐' },
  { name: 'Glowforge / Medium (508×305)', w: 508, h: 305, icon: '🔥' },
  { name: 'Standard Medium (600×400)', w: 600, h: 400, icon: '🪵' },
  { name: 'Large Workshop (900×600)', w: 900, h: 600, icon: '⚙️' },
];

export default function FlatSheetLayout({
  panels,
  spacing,
  sheetWidth,
  sheetHeight,
  onSheetWidthChange,
  onSheetHeightChange,
  onExportSVG,
  onExportDXF,
  onSendToStaff
}: FlatSheetLayoutProps) {
  // Compute full nesting with current dimensions
  const nesting = computeNesting(panels, spacing, sheetWidth, sheetHeight);
  const { placedPanels, sheetsCount } = nesting;

  const [hoveredPanelId, setHoveredPanelId] = useState<string | null>(null);
  
  // Interactive active sheet tab page state
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [showAllSheets, setShowAllSheets] = useState<boolean>(false);

  // Auto-clamp sheet tab index when panel set updates or sheets count shrink
  useEffect(() => {
    if (selectedSheetIndex >= sheetsCount) {
      setSelectedSheetIndex(Math.max(0, sheetsCount - 1));
    }
  }, [sheetsCount, selectedSheetIndex]);

  // We keep local string inputs to support raw text entry / backspacing / typing comfortably
  const [widthInput, setWidthInput] = useState<string>(sheetWidth.toString());
  const [heightInput, setHeightInput] = useState<string>(sheetHeight.toString());

  // Sender details for the Laser Driver postMessage upload
  const [senderName, setSenderName] = useState(() => localStorage.getItem('kapiti_laser_senderName') || '');
  const [senderEmail, setSenderEmail] = useState(() => localStorage.getItem('kapiti_laser_senderEmail') || '');
  const [notes, setNotes] = useState(() => localStorage.getItem('kapiti_laser_notes') || '');

  // Keep local input values in sync if props are changed by presets / external minimum resets
  useEffect(() => {
    setWidthInput(sheetWidth.toString());
  }, [sheetWidth]);

  useEffect(() => {
    setHeightInput(sheetHeight.toString());
  }, [sheetHeight]);

  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 5000) {
      onSheetWidthChange(parsed);
    }
  };

  const handleWidthBlur = () => {
    const parsed = parseFloat(widthInput);
    if (isNaN(parsed) || parsed < 50) {
      onSheetWidthChange(150);
      setWidthInput('150');
    } else if (parsed > 5000) {
      onSheetWidthChange(5000);
      setWidthInput('5000');
    } else {
      onSheetWidthChange(parsed);
      setWidthInput(parsed.toString());
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 5000) {
      onSheetHeightChange(parsed);
    }
  };

  const handleHeightBlur = () => {
    const parsed = parseFloat(heightInput);
    if (isNaN(parsed) || parsed < 50) {
      onSheetHeightChange(150);
      setHeightInput('150');
    } else if (parsed > 5000) {
      onSheetHeightChange(5000);
      setHeightInput('5000');
    } else {
      onSheetHeightChange(parsed);
      setHeightInput(parsed.toString());
    }
  };

  // Determine active sheet to draw if not viewing stacked
  const activeSheetIdx = Math.min(selectedSheetIndex, sheetsCount - 1);

  // Check if any parts exceed dimensions on their respective assigned sheets
  const overflowPanels = placedPanels.filter(placed => {
    const { panel, x, y, rotate } = placed;
    const renderW = rotate ? panel.height : panel.width;
    const renderH = rotate ? panel.width : panel.height;
    return (x + renderW > sheetWidth) || (y + renderH > sheetHeight);
  });
  const hasOverflow = overflowPanels.length > 0;

  // Stacking heights for All Sheets layout view
  const verticalGap = 20;
  const totalSvgHeight = sheetsCount * sheetHeight + (sheetsCount - 1) * verticalGap;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      
      {/* Top Banner Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">Laser-Ready Cut Template</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-paginates components onto multiple material sheets if they exceed dimensions.
            </p>
          </div>
        </div>
        
        {/* Quick Readout */}
        <div className="flex flex-wrap items-center gap-4 border-t xl:border-t-0 xl:border-l border-slate-800 pt-3 xl:pt-0 xl:pl-4">
          <div className="text-left">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Board Format</span>
            <span className="text-xs font-mono font-bold text-blue-300">
              {sheetWidth.toFixed(0)} <span className="text-[10px] text-slate-600">x</span> {sheetHeight.toFixed(0)} <span className="text-[9px] text-slate-500">mm</span>
            </span>
          </div>
          <div className="text-left border-l border-slate-800 pl-4">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Required Sheets</span>
            <span className="text-xs font-mono font-bold text-blue-300">
              {sheetsCount} <span className="text-[9px] text-slate-500">{sheetsCount === 1 ? 'board' : 'boards'}</span>
            </span>
          </div>
          <div className="text-left border-l border-slate-800 pl-4">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cut Parts</span>
            <span className="text-xs font-mono font-bold text-blue-300">
              {panels.length} <span className="text-[9px] text-slate-500">planes</span>
            </span>
          </div>
          {hasOverflow && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 animate-pulse shrink-0">
              <span>⚠️ FIT WARNING</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout: Config controls + SVG Preview canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        
        {/* Left Column Config: Custom material/sheet controls */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-extrabold tracking-wider uppercase select-none">
              <Sliders className="w-3.5 h-3.5" />
              <span>Sheet Dimensions</span>
            </div>

            {/* Custom stock sheet inputs */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase">Sheet Width (mm)</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={widthInput}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    onBlur={handleWidthBlur}
                    className="flex-grow w-full bg-slate-900 border border-slate-800 focus:border-blue-500 text-blue-400 font-extrabold font-mono text-xs rounded-l py-1.5 px-2.5 focus:outline-none"
                    placeholder="W (mm)"
                  />
                  <div className="bg-slate-800 border-y border-r border-slate-705 text-slate-400 text-[10px] font-extrabold px-2.5 h-8 flex items-center justify-center rounded-r select-none">
                    W
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase">Sheet Height (mm)</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={heightInput}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    onBlur={handleHeightBlur}
                    className="flex-grow w-full bg-slate-900 border border-slate-800 focus:border-blue-500 text-blue-400 font-extrabold font-mono text-xs rounded-l py-1.5 px-2.5 focus:outline-none"
                    placeholder="H (mm)"
                  />
                  <div className="bg-slate-800 border-y border-r border-slate-755 text-slate-400 text-[10px] font-extrabold px-2.5 h-8 flex items-center justify-center rounded-r select-none">
                    H
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Auto Min Scale Button */}
            <button
              onClick={() => {
                // Auto calculate optimal minimal dimensions based on natural nesting
                const tempNesting = computeNesting(panels, spacing);
                onSheetWidthChange(Math.ceil(tempNesting.sheetWidth));
                onSheetHeightChange(Math.ceil(tempNesting.sheetHeight));
              }}
              className="mt-1.5 flex items-center justify-center gap-2 hover:bg-slate-850 bg-slate-900 border border-slate-850 hover:border-slate-800 py-1.5 px-3 rounded-lg text-[10px] font-bold text-slate-300 transition-all cursor-pointer"
              title="Resize the stock sheet to the tightest minimum size fitting all panels."
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset to Minimum Fit</span>
            </button>
          </div>

          {/* Quick Laser Presets selection */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-extrabold tracking-wider uppercase select-none">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Standard Stock Boards</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = Math.abs(sheetWidth - preset.w) < 2 && Math.abs(sheetHeight - preset.h) < 2;
                return (
                  <button
                    key={preset.name}
                    onClick={() => {
                      onSheetWidthChange(preset.w);
                      onSheetHeightChange(preset.h);
                    }}
                    className={`text-left py-2 px-3 rounded-lg border text-xs transition-all cursor-pointer flex items-center gap-2.5 ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500 text-blue-300 font-bold'
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-sm shrink-0">{preset.icon}</span>
                    <span className="text-[10px] font-medium leading-tight truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Exports Section */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-3 flex-grow justify-start">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-extrabold tracking-wider uppercase select-none">
              <Download className="w-3.5 h-3.5" />
              <span>Generate Cut Files</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportSVG}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 px-1.5 rounded-lg text-[10px] font-extrabold shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                title="Download 2D design SVG file"
              >
                <Download className="w-3 h-3" />
                <span>SVG Layout</span>
              </button>
              <button
                onClick={onExportDXF}
                className="flex items-center justify-center gap-1.5 bg-slate-850 hover:bg-slate-750 text-slate-100 border border-slate-75 font-extrabold py-2 px-1.5 rounded-lg text-[10px] shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                title="Download standard 2D DXF CAD file"
              >
                <Scissors className="w-3 h-3 text-blue-400" />
                <span>DXF CAD</span>
              </button>
            </div>
            <div className="text-[9.5px] text-slate-500 leading-normal font-medium mt-1">
              File coordinates set relative to specified <strong className="text-slate-400">{sheetWidth.toFixed(0)}x{sheetHeight.toFixed(0)}mm</strong> boards.
            </div>
          </div>

          {/* Send to Staff Section */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-extrabold tracking-wider uppercase select-none">
              <Send className="w-3.5 h-3.5" />
              <span>Send Layout to Staff</span>
            </div>
            
            <div className="flex flex-col gap-2.5">
              {/* Name Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-600" />
                  Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    localStorage.setItem('kapiti_laser_senderName', e.target.value);
                  }}
                  placeholder="Your Name"
                  className="w-full bg-slate-900 border border-slate-850 focus:border-blue-500 text-slate-200 text-xs rounded py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-600" />
                  Email
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => {
                    setSenderEmail(e.target.value);
                    localStorage.setItem('kapiti_laser_senderEmail', e.target.value);
                  }}
                  placeholder="your.email@example.com"
                  className="w-full bg-slate-900 border border-slate-850 focus:border-blue-500 text-slate-200 text-xs rounded py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              {/* Notes Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-slate-600" />
                  Notes / Instructions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    localStorage.setItem('kapiti_laser_notes', e.target.value);
                  }}
                  placeholder="Material, thickness, specs..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-blue-500 text-slate-200 text-xs rounded py-1.5 px-2.5 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={() => {
                  if (onSendToStaff) {
                    onSendToStaff(senderName, senderEmail, notes);
                  }
                }}
                disabled={!senderName || !senderEmail}
                className="mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-2 px-3 rounded-lg text-xs shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                title="Send SVG design directly to Laser Driver website"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Staff</span>
              </button>
            </div>
            
            <p className="text-[9px] text-slate-500 leading-normal font-medium select-none">
              This opens the Laser Driver in a new tab and securely streams this design with your details.
            </p>
          </div>

        </div>

        {/* Right Column Canvas: Scaled material view and interactive preview */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          
          {/* MULTI_SHEET NAVIGATION TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/60 border border-slate-800 p-2 rounded-xl">
            <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
              {Array.from({ length: sheetsCount }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedSheetIndex(index);
                    setShowAllSheets(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs leading-none transition-all cursor-pointer font-bold ${
                    !showAllSheets && activeSheetIdx === index
                      ? 'bg-blue-600 text-white shadow shadow-blue-500/20'
                      : 'bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Board {index + 1}
                </button>
              ))}
            </div>

            {sheetsCount > 1 && (
              <button
                onClick={() => setShowAllSheets(!showAllSheets)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showAllSheets
                    ? 'bg-blue-900/40 border border-blue-500/50 text-blue-300'
                    : 'bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>{showAllSheets ? 'View Single Board' : 'Show All Boards Stacked'}</span>
              </button>
            )}
          </div>

          {/* Danger/Advisory alerts */}
          {hasOverflow && (
            <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl flex gap-3 text-xs leading-relaxed text-red-300">
              <div className="text-base shrink-0 select-none">⛔</div>
              <div>
                <span className="font-extrabold text-red-200 uppercase tracking-wide">Sheet boundary collision warning</span>
                <p className="mt-1 text-slate-300">
                  Some laser cut components (
                  <span className="text-red-200 font-semibold">
                    {overflowPanels.map((placed) => placed.panel.name).join(', ')}
                  </span>
                  ) exceed current sheet material bounds. Increase sheet size, use a larger preset, or decrease sheet padding.
                </p>
              </div>
            </div>
          )}

          {/* Canvas box */}
          <div className="relative bg-white rounded-xl border border-slate-200 flex items-center justify-center p-6 overflow-auto max-h-[460px] shadow-inner">
            <svg
              viewBox={showAllSheets ? `0 0 ${sheetWidth} ${totalSvgHeight}` : `0 0 ${sheetWidth} ${sheetHeight}`}
              className="w-full max-w-full h-auto drop-shadow-sm select-none"
              style={{ maxHeight: showAllSheets ? '420px' : '380px' }}
            >
              <defs>
                <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.3" />
                </pattern>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="url(#smallGrid)" />
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
                </pattern>
              </defs>

              {/* Render sheets backgrounds */}
              {Array.from({ length: showAllSheets ? sheetsCount : 1 }).map((_, i) => {
                const drawIdx = showAllSheets ? i : activeSheetIdx;
                const offsetY = showAllSheets ? i * (sheetHeight + verticalGap) : 0;

                return (
                  <g key={i} transform={`translate(0, ${offsetY})`}>
                    {/* Border of the stock sheet material */}
                    <rect
                      width={sheetWidth}
                      height={sheetHeight}
                      fill="#ffffff"
                      stroke={hasOverflow ? "#f87171" : "#0f172a"}
                      strokeWidth={hasOverflow ? "1.5" : "0.8"}
                      strokeDasharray="4 3"
                    />

                    {/* Grid backdrop */}
                    <rect width={sheetWidth} height={sheetHeight} fill="url(#grid)" />

                    {/* Sheet identification label burned inside canvas */}
                    <text
                      x="10"
                      y="16"
                      fill="#94a3b8"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="extrabold"
                      className="opacity-70 uppercase tracking-widest"
                    >
                      BOARD {drawIdx + 1} OF {sheetsCount} ({sheetWidth.toFixed(0)}x{sheetHeight.toFixed(0)}mm)
                    </text>
                  </g>
                );
              })}

              {/* Render packed panels */}
              {placedPanels
                .filter((placed) => showAllSheets || placed.sheetIndex === activeSheetIdx)
                .map((placed) => {
                  const { panel, x, y, rotate, sheetIndex } = placed;
                  const isHovered = hoveredPanelId === panel.id;
                  
                  const renderW = rotate ? panel.height : panel.width;
                  const renderH = rotate ? panel.width : panel.height;
                  const isOverflowing = (x + renderW > sheetWidth) || (y + renderH > sheetHeight);

                  const { points, holes, engravePaths } = getRotatedPointsAndHoles(panel, rotate);
                  const offsetY = showAllSheets ? sheetIndex * (sheetHeight + verticalGap) : 0;

                  let dString = '';
                  points.forEach((pt, idx) => {
                    dString += `${idx === 0 ? 'M' : 'L'} ${x + pt.x} ${offsetY + y + pt.y} `;
                  });
                  dString += 'Z';

                  // Generate SVG path for engrave paths
                  let engraveDString = '';
                  if (engravePaths && engravePaths.length > 0) {
                    engravePaths.forEach((path) => {
                      if (path.length === 0) return;
                      path.forEach((pt, idx) => {
                        engraveDString += `${idx === 0 ? 'M' : 'L'} ${x + pt.x} ${offsetY + y + pt.y} `;
                      });
                      const first = path[0];
                      const last = path[path.length - 1];
                      if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 0.1) {
                        engraveDString += 'Z';
                      }
                    });
                  }

                  // Append any inner holes/cutouts
                  if (holes && holes.length > 0) {
                    holes.forEach((hole) => {
                      hole.forEach((pt, idx) => {
                        dString += ` ${idx === 0 ? 'M' : 'L'} ${x + pt.x} ${offsetY + y + pt.y}`;
                      });
                      dString += ' Z';
                    });
                  }

                  return (
                    <g
                      key={panel.id}
                      onMouseEnter={() => setHoveredPanelId(panel.id)}
                      onMouseLeave={() => setHoveredPanelId(null)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      {/* Panel Shape */}
                      <path
                        d={dString}
                        fill={
                          isHovered
                            ? 'rgba(7, 89, 133, 0.08)'
                            : isOverflowing
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(230, 215, 195, 0.28)'
                        }
                        fillRule="evenodd"
                        stroke={
                          isHovered
                            ? '#0284c7'
                            : isOverflowing
                            ? '#ef4444'
                            : '#1e293b'
                        }
                        strokeWidth={isHovered ? '0.85' : isOverflowing ? '0.7' : '0.45'}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray={isOverflowing ? '2 1.5' : undefined}
                        className="transition-all duration-150"
                      />

                      {/* Custom Vector Engravings */}
                      {engraveDString && (
                        <path
                          d={engraveDString}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="0.45"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Laser Engraving Visual Aid Guideline */}
                      {!isHovered && !isOverflowing && (
                        <path
                          d={dString}
                          fill="none"
                          fillRule="evenodd"
                          stroke="#d97706"
                          strokeWidth="0.12"
                          strokeDasharray="1 3"
                          opacity="0.65"
                        />
                      )}

                      {/* Dimension tooltip label centered dynamically */}
                      {isHovered && (
                        <>
                          <rect
                            x={x + renderW / 2 - 35}
                            y={offsetY + y + renderH / 2 - 8}
                            width="70"
                            height="13"
                            rx="3"
                            fill="#0f172a"
                          />
                          <text
                            x={x + renderW / 2}
                            y={offsetY + y + renderH / 2 - 1.5}
                            fill="#ffffff"
                            fontSize="4.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                          >
                            {panel.width.toFixed(0)}x{panel.height.toFixed(0)} mm {rotate ? '🔄' : ''}
                          </text>
                        </>
                      )}

                      {/* Part title label */}
                      <text
                        x={x + 10}
                        y={offsetY + y + 12}
                        fill={isOverflowing ? '#b91c1c' : isHovered ? '#0284c7' : '#334155'}
                        fontFamily="monospace"
                        fontWeight="bold"
                        fontSize="4.5"
                        className="select-none"
                      >
                        {panel.name} {rotate ? '🔄' : ''}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>

        </div>

      </div>

      {/* Info strip about materials and placement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {placedPanels
          .filter((placed) => showAllSheets || placed.sheetIndex === activeSheetIdx)
          .map(({ panel, x, y, rotate, sheetIndex }) => {
            const renderW = rotate ? panel.height : panel.width;
            const renderH = rotate ? panel.width : panel.height;
            const isOverflowing = (x + renderW > sheetWidth) || (y + renderH > sheetHeight);
            return (
              <div
                key={panel.id}
                onMouseEnter={() => setHoveredPanelId(panel.id)}
                onMouseLeave={() => setHoveredPanelId(null)}
                className={`px-4 py-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                  hoveredPanelId === panel.id
                    ? 'bg-blue-950/40 border-blue-500/50 shadow-md ring-1 ring-blue-500/20'
                    : isOverflowing
                    ? 'bg-red-950/20 border-red-900/30 text-red-200'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className={`text-xs font-bold capitalize flex items-center gap-2 ${isOverflowing ? 'text-red-400' : 'text-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOverflowing ? 'bg-red-500' : 'bg-blue-500'}`} />
                      {panel.name} {rotate && <span className="text-yellow-500 text-[10px]" title="Automatically rotated 90 degrees to fit sheet boundaries">🔄</span>}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                      ID: {panel.id} • Board {sheetIndex + 1}
                    </span>
                  </div>
                  {isOverflowing && (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wide uppercase shrink-0">
                      Exceeds space
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-mono text-slate-400 font-semibold" title="Original Dimensions">
                    {panel.width} x {panel.height} mm
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Offset: X:{x.toFixed(0)}, Y:{y.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
