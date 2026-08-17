/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  PanelData,
  computeNesting,
  getRotatedPointsAndHoles,
  NestingStrategy,
  NestingLayout
} from '../lib/boxGeometry';
import {
  Layers,
  RotateCcw,
  Sliders,
  LayoutGrid,
  Download,
  Scissors,
  Check,
  Eye,
  Send,
  User,
  Mail,
  MessageSquare,
  FileCode,
  ExternalLink,
  Sparkles,
  Cpu,
  Maximize2,
  BarChart2,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';

interface FlatSheetLayoutProps {
  panels: PanelData[];
  spacing: number;
  sheetWidth: number;
  sheetHeight: number;
  nestingStrategy?: NestingStrategy;
  allowRotation?: boolean;
  onSheetWidthChange: (w: number) => void;
  onSheetHeightChange: (h: number) => void;
  onSpacingChange?: (s: number) => void;
  onNestingStrategyChange?: (strategy: NestingStrategy) => void;
  onAllowRotationChange?: (allow: boolean) => void;
  onExportSVG?: () => void;
  onExportDXF?: () => void;
  onSendToStaff?: (senderName: string, senderEmail: string, notes: string, fileName?: string) => void;
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
  nestingStrategy = 'max-rects',
  allowRotation = true,
  onSheetWidthChange,
  onSheetHeightChange,
  onSpacingChange,
  onNestingStrategyChange,
  onAllowRotationChange,
  onExportSVG,
  onExportDXF,
  onSendToStaff
}: FlatSheetLayoutProps) {
  // Local fallback if props not controlled externally
  const [localStrategy, setLocalStrategy] = useState<NestingStrategy>(nestingStrategy);
  const [localAllowRotation, setLocalAllowRotation] = useState<boolean>(allowRotation);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  useEffect(() => {
    setLocalStrategy(nestingStrategy);
  }, [nestingStrategy]);

  useEffect(() => {
    setLocalAllowRotation(allowRotation);
  }, [allowRotation]);

  const activeStrategy = onNestingStrategyChange ? nestingStrategy : localStrategy;
  const activeAllowRotation = onAllowRotationChange ? allowRotation : localAllowRotation;

  const handleStrategySelect = (strat: NestingStrategy) => {
    if (onNestingStrategyChange) {
      onNestingStrategyChange(strat);
    } else {
      setLocalStrategy(strat);
    }
  };

  const handleAllowRotationToggle = (val: boolean) => {
    if (onAllowRotationChange) {
      onAllowRotationChange(val);
    } else {
      setLocalAllowRotation(val);
    }
  };

  // Compute full nesting with current dimensions and options
  const nesting: NestingLayout = computeNesting(panels, spacing, sheetWidth, sheetHeight, {
    strategy: activeStrategy,
    allowRotation: activeAllowRotation
  });

  const {
    placedPanels,
    sheetsCount,
    totalPartsArea,
    totalSheetArea,
    overallEfficiency,
    wastePercent,
    tightBoundingWidth,
    tightBoundingHeight,
    sheetStats
  } = nesting;

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

  // Sender details for the Laser Driver postMessage upload & One-Click Redirection
  const [senderName, setSenderName] = useState(() => localStorage.getItem('user_name') || localStorage.getItem('kapiti_laser_senderName') || '');
  const [senderEmail, setSenderEmail] = useState(() => localStorage.getItem('user_email') || localStorage.getItem('kapiti_laser_senderEmail') || '');
  const [notes, setNotes] = useState(() => localStorage.getItem('user_notes') || localStorage.getItem('kapiti_laser_notes') || '');
  const [fileName, setFileName] = useState(() => localStorage.getItem('kapiti_laser_fileName') || 'my_design.svg');

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

  // One-click Auto Compact to tightest material bounds
  const handleAutoCompactStock = () => {
    setIsOptimizing(true);
    onSheetWidthChange(tightBoundingWidth);
    onSheetHeightChange(tightBoundingHeight);
    setWidthInput(tightBoundingWidth.toString());
    setHeightInput(tightBoundingHeight.toString());
    setTimeout(() => setIsOptimizing(false), 500);
  };

  // Determine active sheet to draw if not viewing stacked
  const activeSheetIdx = Math.min(selectedSheetIndex, sheetsCount - 1);
  const activeSheetStat = sheetStats[activeSheetIdx];

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

  // Formatting helpers for surface area
  const formatArea = (areaMm2: number) => {
    const cm2 = areaMm2 / 100;
    if (cm2 >= 10000) {
      return `${(cm2 / 10000).toFixed(2)} m²`;
    }
    return `${cm2.toFixed(1)} cm²`;
  };

  // Efficiency color classification
  const getEfficiencyColor = (eff: number) => {
    if (eff >= 75) return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Optimal Density' };
    if (eff >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Standard Density' };
    return { bg: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Oversized Stock (Trim to fit)' };
  };

  const effInfo = getEfficiencyColor(overallEfficiency);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-5">
      
      {/* Top Banner Row: Header & Key Metrics Readout */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Laser-Ready Cut Template</h4>
              <span className="bg-blue-100/80 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200/60 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Smart Nesting Active
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
              Intelligent multi-pass bin packing nests components to maximize sheet density and minimize material waste.
            </p>
          </div>
        </div>
        
        {/* Quick Readout Header */}
        <div className="flex flex-wrap items-center gap-4 border-t xl:border-t-0 xl:border-l border-slate-200 pt-3 xl:pt-0 xl:pl-4">
          <div className="text-left">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sheet Format</span>
            <span className="text-xs font-mono font-bold text-blue-600">
              {sheetWidth.toFixed(0)} <span className="text-[10px] text-slate-400">×</span> {sheetHeight.toFixed(0)} <span className="text-[9px] text-slate-500">mm</span>
            </span>
          </div>
          <div className="text-left border-l border-slate-200 pl-4">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Material Efficiency</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-mono font-bold ${effInfo.text}`}>
                {overallEfficiency.toFixed(1)}%
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${effInfo.badge}`}>
                {effInfo.label}
              </span>
            </div>
          </div>
          <div className="text-left border-l border-slate-200 pl-4">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Required Boards</span>
            <span className="text-xs font-mono font-bold text-blue-600">
              {sheetsCount} <span className="text-[9px] text-slate-500">{sheetsCount === 1 ? 'board' : 'boards'}</span>
            </span>
          </div>
          <div className="text-left border-l border-slate-200 pl-4">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cut Parts</span>
            <span className="text-xs font-mono font-bold text-blue-600">
              {panels.length} <span className="text-[9px] text-slate-500">panels</span>
            </span>
          </div>
          {hasOverflow && (
            <div className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 animate-pulse shrink-0">
              <span>⚠️ FIT OVERFLOW</span>
            </div>
          )}
        </div>
      </div>

      {/* NESTING & MATERIAL EFFICIENCY OPTIMIZATION SECTION */}
      <div className="bg-linear-to-r from-blue-50/70 via-slate-50 to-blue-50/40 border border-blue-200/80 rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Nesting Engine &amp; Waste Reducer
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  {wastePercent < 25 ? 'Low Scrap' : `${wastePercent.toFixed(0)}% Offcut Available`}
                </span>
              </span>
              <p className="text-[11px] text-slate-600">
                Choose the packing algorithm and orientation options to minimize offcut scrap and save raw material.
              </p>
            </div>
          </div>

          {/* Quick Auto-Fit Action Button */}
          <button
            onClick={handleAutoCompactStock}
            disabled={isOptimizing}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0"
            title="Automatically shrinks the stock sheet to the exact tightest rectangular boundary containing all nested panels"
          >
            <Maximize2 className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>Trim Sheet to Minimum Fit ({tightBoundingWidth}×{tightBoundingHeight}mm)</span>
          </button>
        </div>

        {/* Nesting Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* 1. Algorithm Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-blue-600" />
              Packing Strategy
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs text-center">
              <button
                type="button"
                onClick={() => handleStrategySelect('max-rects')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeStrategy === 'max-rects'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Best-Fit MaxRects bin packing tries all orientations and size heuristics to minimize required sheets"
              >
                Max Density
              </button>
              <button
                type="button"
                onClick={() => handleStrategySelect('shelf')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeStrategy === 'shelf'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Best-Fit Decreasing Shelf row layout"
              >
                Shelf Flow
              </button>
              <button
                type="button"
                onClick={() => handleStrategySelect('sequential')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  activeStrategy === 'sequential'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Preserves original front, back, top, bottom box panel sequence"
              >
                Sequential
              </button>
            </div>
          </div>

          {/* 2. Rotation Permission Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3 text-blue-600" />
              Orientation Flexibility
            </label>
            <label className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer hover:border-slate-300 transition-all">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-800">Allow 90° Rotation</span>
                <span className="text-[9px] text-slate-500">Rotate parts to fill tight slots &amp; voids</span>
              </div>
              <input
                type="checkbox"
                checked={activeAllowRotation}
                onChange={(e) => handleAllowRotationToggle(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
            </label>
          </div>

          {/* 3. Kerf / Spacing Margin Quick Adjust */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-blue-600" />
                Inter-Part Kerf Margin
              </label>
              <span className="text-[11px] font-mono font-bold text-blue-600">{spacing} mm</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={spacing}
                onChange={(e) => onSpacingChange && onSpacingChange(Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
              />
              <div className="flex gap-1 shrink-0">
                {[3, 6, 10].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => onSpacingChange && onSpacingChange(presetVal)}
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                      spacing === presetVal
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {presetVal}mm
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Material Utilization Progress Meter */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              Material Utilization Breakdown:
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-slate-600 font-bold">
                Parts Surface: <strong className="text-slate-900">{formatArea(totalPartsArea)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-bold">
                Stock Area: <strong className="text-slate-900">{formatArea(totalSheetArea)}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 font-bold">
                Contiguous Offcut: <strong className="text-emerald-700">{formatArea(Math.max(0, totalSheetArea - totalPartsArea))}</strong>
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
            <div
              className={`h-full ${effInfo.bg} transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(5, overallEfficiency))}%` }}
              title={`Used Parts: ${overallEfficiency.toFixed(1)}%`}
            />
            <div
              className="h-full bg-slate-300 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, 100 - overallEfficiency))}%` }}
              title={`Offcut Scrap: ${(100 - overallEfficiency).toFixed(1)}%`}
            />
          </div>
        </div>

      </div>

      {/* Grid Layout: Config controls + SVG Preview canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        
        {/* Left Column Config: Custom material/sheet controls */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-extrabold tracking-wider uppercase select-none">
              <Sliders className="w-3.5 h-3.5" />
              <span>Stock Sheet Dimensions</span>
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
                    className="grow w-full bg-white border border-slate-250 focus:border-blue-600 text-blue-700 font-extrabold font-mono text-xs rounded-l py-1.5 px-2.5 focus:outline-none"
                    placeholder="W (mm)"
                  />
                  <div className="bg-slate-100 border-y border-r border-slate-200 text-slate-500 text-[10px] font-extrabold px-2.5 h-8 flex items-center justify-center rounded-r select-none">
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
                    className="grow w-full bg-white border border-slate-250 focus:border-blue-600 text-blue-700 font-extrabold font-mono text-xs rounded-l py-1.5 px-2.5 focus:outline-none"
                    placeholder="H (mm)"
                  />
                  <div className="bg-slate-100 border-y border-r border-slate-200 text-slate-500 text-[10px] font-extrabold px-2.5 h-8 flex items-center justify-center rounded-r select-none">
                    H
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Auto Min Scale Button */}
            <button
              onClick={handleAutoCompactStock}
              className="mt-1.5 flex items-center justify-center gap-2 hover:bg-slate-100 bg-white border border-slate-200 hover:border-slate-300 py-1.5 px-3 rounded-lg text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Resize the stock sheet to the tightest minimum size fitting all panels."
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Auto-Shrink to Minimum ({tightBoundingWidth}×{tightBoundingHeight}mm)</span>
            </button>
          </div>

          {/* Quick Laser Presets selection */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-extrabold tracking-wider uppercase select-none">
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
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 shadow-xs'
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
          <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex flex-col gap-3 grow justify-start shadow-xs">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-extrabold tracking-wider uppercase select-none">
              <Download className="w-3.5 h-3.5" />
              <span>Generate Cut Files</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportSVG}
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 shadow-xs font-extrabold py-2 px-1.5 rounded-lg text-[10px] transition-all active:scale-[0.98] cursor-pointer"
                title="Download 2D design SVG file"
              >
                <Download className="w-3 h-3 text-blue-600" />
                <span>SVG Layout</span>
              </button>
              <button
                onClick={onExportDXF}
                className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs font-extrabold py-2 px-1.5 rounded-lg text-[10px] transition-all active:scale-[0.98] cursor-pointer"
                title="Download standard 2D DXF CAD file"
              >
                <Scissors className="w-3 h-3 text-blue-600" />
                <span>DXF CAD</span>
              </button>
            </div>
            <div className="text-[9.5px] text-slate-600 leading-normal font-medium mt-1">
              File coordinates set relative to specified <strong className="text-slate-800">{sheetWidth.toFixed(0)}×{sheetHeight.toFixed(0)}mm</strong> boards.
            </div>
          </div>

          {/* One-Click Redirection to Laser Driver */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-extrabold tracking-wider uppercase select-none">
                <Send className="w-3.5 h-3.5" />
                <span>Laser Driver Redirection</span>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-200">
                CORS *
              </span>
            </div>
            
            <div className="flex flex-col gap-2.5">
              {/* Name Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Sender Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    localStorage.setItem('user_name', e.target.value);
                    localStorage.setItem('kapiti_laser_senderName', e.target.value);
                  }}
                  placeholder="Your Name / Generator"
                  className="w-full bg-white border border-slate-200 focus:border-blue-600 text-slate-800 text-xs rounded py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  Sender Email
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => {
                    setSenderEmail(e.target.value);
                    localStorage.setItem('user_email', e.target.value);
                    localStorage.setItem('kapiti_laser_senderEmail', e.target.value);
                  }}
                  placeholder="user@contact.com"
                  className="w-full bg-white border border-slate-200 focus:border-blue-600 text-slate-800 text-xs rounded py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              {/* File Name Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-slate-400" />
                  File Name (.svg)
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => {
                    setFileName(e.target.value);
                    localStorage.setItem('kapiti_laser_fileName', e.target.value);
                  }}
                  placeholder="my_design.svg"
                  className="w-full bg-white border border-slate-200 focus:border-blue-600 text-slate-800 text-xs rounded py-1.5 px-2.5 focus:outline-none font-mono"
                />
              </div>

              {/* Notes Field */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  Cutting Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    localStorage.setItem('user_notes', e.target.value);
                    localStorage.setItem('kapiti_laser_notes', e.target.value);
                  }}
                  placeholder="Material, kerf, special instructions..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 focus:border-blue-600 text-slate-800 text-xs rounded py-1.5 px-2.5 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={() => {
                  if (onSendToStaff) {
                    onSendToStaff(senderName, senderEmail, notes, fileName);
                  }
                }}
                disabled={!senderName || !senderEmail}
                className="mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold py-2 px-3 rounded-lg text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                title="Generate CORS hosted SVG link & redirect with query params to Laser Controller"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Laser Controller</span>
              </button>
            </div>
            
            <p className="text-[9px] text-slate-500 leading-normal font-medium select-none">
              Hosts your SVG with CORS enabled (<code className="font-mono font-bold">Access-Control-Allow-Origin: *</code>) and triggers one-click import redirection with encoded query params.
            </p>
          </div>

        </div>

        {/* Right Column Canvas: Scaled material view and interactive preview */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          
          {/* MULTI_SHEET NAVIGATION TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 p-2 rounded-xl">
            <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
              {Array.from({ length: sheetsCount }).map((_, index) => {
                const sheetStat = sheetStats[index];
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSheetIndex(index);
                      setShowAllSheets(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs leading-none transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                      !showAllSheets && activeSheetIdx === index
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-650 hover:text-slate-800 shadow-xs'
                    }`}
                  >
                    <span>Board {index + 1}</span>
                    {sheetStat && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        !showAllSheets && activeSheetIdx === index
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {sheetStat.efficiency.toFixed(0)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {sheetsCount > 1 && (
              <button
                onClick={() => setShowAllSheets(!showAllSheets)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  showAllSheets
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-750 shadow-xs'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{showAllSheets ? 'View Single Board' : 'Show All Boards Stacked'}</span>
              </button>
            )}
          </div>

          {/* Danger/Advisory alerts */}
          {hasOverflow && (
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex gap-3 text-xs leading-relaxed text-red-700">
              <div className="text-base shrink-0 select-none">⛔</div>
              <div>
                <span className="font-extrabold text-red-800 uppercase tracking-wide">Sheet boundary collision warning</span>
                <p className="mt-1 text-slate-700">
                  Some laser cut components (
                  <span className="text-red-800 font-semibold">
                    {overflowPanels.map((placed) => placed.panel.name).join(', ')}
                  </span>
                  ) exceed current sheet material bounds. Increase sheet size, use a larger preset, or decrease sheet padding.
                </p>
              </div>
            </div>
          )}

          {/* Canvas box */}
          <div 
            className="relative bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-6 overflow-auto max-h-[460px] shadow-inner"
          >
            <svg
              viewBox={showAllSheets ? `0 0 ${sheetWidth} ${totalSvgHeight}` : `0 0 ${sheetWidth} ${sheetHeight}`}
              className="w-full max-w-full h-auto drop-shadow-xs select-none cad-cursor-default"
              style={{ maxHeight: showAllSheets ? '420px' : '380px' }}
            >
              <defs>
                <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
                </pattern>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="url(#smallGrid)" />
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="0.6" />
                </pattern>
              </defs>

              {/* Render sheets backgrounds */}
              {Array.from({ length: showAllSheets ? sheetsCount : 1 }).map((_, i) => {
                const drawIdx = showAllSheets ? i : activeSheetIdx;
                const offsetY = showAllSheets ? i * (sheetHeight + verticalGap) : 0;
                const stat = sheetStats[drawIdx];

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

                    {/* Dotted bounding box of nested components on this sheet */}
                    {stat && stat.usedWidth > 0 && stat.usedHeight > 0 && (
                      <rect
                        x="0"
                        y="0"
                        width={stat.usedWidth}
                        height={stat.usedHeight}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.4"
                        strokeDasharray="2 2"
                        opacity="0.6"
                      />
                    )}

                    {/* Sheet identification label burned inside canvas */}
                    <text
                      x="10"
                      y="16"
                      fill="#64748b"
                      fontSize="6.5"
                      fontFamily="monospace"
                      fontWeight="extrabold"
                      className="opacity-70 uppercase tracking-widest"
                    >
                      BOARD {drawIdx + 1} OF {sheetsCount} ({sheetWidth.toFixed(0)}×{sheetHeight.toFixed(0)}mm) • {stat ? `${stat.efficiency.toFixed(1)}% Eff` : ''}
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
                            ? 'rgba(59, 130, 246, 0.15)'
                            : isOverflowing
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(230, 215, 195, 0.28)'
                        }
                        fillRule="evenodd"
                        stroke={
                          isHovered
                            ? '#3b82f6'
                            : isOverflowing
                            ? '#ef4444'
                            : '#0f172a'
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
                          stroke="#2563eb"
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
                          stroke="#f59e0b"
                          strokeWidth="0.12"
                          strokeDasharray="1 3"
                          opacity="0.65"
                        />
                      )}

                      {/* Dimension tooltip label centered dynamically */}
                      {isHovered && (
                        <>
                          <rect
                            x={x + renderW / 2 - 40}
                            y={offsetY + y + renderH / 2 - 9}
                            width="80"
                            height="16"
                            rx="3"
                            fill="#0f172a"
                          />
                          <text
                            x={x + renderW / 2}
                            y={offsetY + y + renderH / 2 - 2}
                            fill="#ffffff"
                            fontSize="4.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                          >
                            {panel.width.toFixed(0)}×{panel.height.toFixed(0)} mm {rotate ? '(90°)' : ''}
                          </text>
                          <text
                            x={x + renderW / 2}
                            y={offsetY + y + renderH / 2 + 3.5}
                            fill="#93c5fd"
                            fontSize="3.5"
                            fontFamily="monospace"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                          >
                            Area: {((panel.width * panel.height) / 100).toFixed(1)} cm²
                          </text>
                        </>
                      )}

                      {/* Part title label */}
                      <text
                        x={x + 10}
                        y={offsetY + y + 12}
                        fill={isOverflowing ? '#b91c1c' : isHovered ? '#2563eb' : '#334155'}
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
            const panelArea = (panel.width * panel.height) / 100;
            return (
              <div
                key={panel.id}
                onMouseEnter={() => setHoveredPanelId(panel.id)}
                onMouseLeave={() => setHoveredPanelId(null)}
                className={`px-4 py-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                  hoveredPanelId === panel.id
                    ? 'bg-blue-50 border-blue-500/50 shadow-xs ring-1 ring-blue-500/10'
                    : isOverflowing
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className={`text-xs font-bold capitalize flex items-center gap-2 ${isOverflowing ? 'text-red-600' : 'text-slate-800'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOverflowing ? 'bg-red-500' : 'bg-blue-600'}`} />
                      {panel.name} {rotate && <span className="text-yellow-600 text-[10px]" title="Automatically rotated 90 degrees to fit sheet boundaries">🔄 90°</span>}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                      ID: {panel.id} • Board {sheetIndex + 1} • {panelArea.toFixed(1)} cm²
                    </span>
                  </div>
                  {isOverflowing && (
                    <span className="bg-red-100 text-red-750 border border-red-200 rounded px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wide uppercase shrink-0">
                      Exceeds space
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-mono text-slate-500 font-semibold" title="Original Dimensions">
                    {panel.width} × {panel.height} mm
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
