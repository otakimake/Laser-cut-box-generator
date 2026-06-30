/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  generateBoxPanels,
  BoxParams,
  PanelData,
  exportToSVG,
  exportToDXF,
  Point2D
} from './lib/boxGeometry';
import { traceImage } from './lib/imageTracer';
import ThreeBoxViewer from './components/ThreeBoxViewer';
import FlatSheetLayout from './components/FlatSheetLayout';
import {
  Box,
  Scissors,
  Download,
  Settings,
  Eye,
  RefreshCcw,
  Ruler,
  Layers,
  Info,
  Sparkles,
  HelpCircle,
  Check,
  ChevronRight,
  Sparkle,
  Cpu,
  MousePointer,
  Image,
  Sliders,
  Trash2,
  Link,
  Plus,
  Copy
} from 'lucide-react';

// Design presets for quick loading
interface Preset {
  name: string;
  description: string;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  fingerWidth: number;
  laserKerf: number;
  boxType: 'closed' | 'open-top' | 'removable-lid';
  hasEnvelopeSlot?: boolean;
  envelopeSlotWidth?: number;
  envelopeSlotThickness?: number;
}

const PRESETS: Preset[] = [
  {
    name: 'Jewelry Box',
    description: 'Compact 6-sided interlocking box for delicate items.',
    width: 100,
    height: 70,
    depth: 80,
    thickness: 3.0,
    fingerWidth: 10.0,
    laserKerf: 0.10,
    boxType: 'closed'
  },
  {
    name: 'Pencil Tray',
    description: '5-sided open tray with clean straight top edges.',
    width: 200,
    height: 90,
    depth: 110,
    thickness: 4.0,
    fingerWidth: 15.0,
    laserKerf: 0.08,
    boxType: 'open-top'
  },
  {
    name: 'Gift Chest',
    description: 'Sizable chest with a removable interlocking fitted lid.',
    width: 240,
    height: 150,
    depth: 160,
    thickness: 5.5,
    fingerWidth: 20.0,
    laserKerf: 0.12,
    boxType: 'removable-lid'
  },
  {
    name: 'Card Slot Box',
    description: 'Wedding envelope, donation, or money piggy-bank box with an top slot cutout.',
    width: 250,
    height: 160,
    depth: 180,
    thickness: 4.0,
    fingerWidth: 16.0,
    laserKerf: 0.10,
    boxType: 'removable-lid',
    hasEnvelopeSlot: true,
    envelopeSlotWidth: 150,
    envelopeSlotThickness: 8
  }
];

const WOOD_TYPES = [
  { name: 'MDF (Fiberboard)', color: '#cb9d6c', value: 'mdf', description: 'Engineered wood fiber. Smooth surface, uniform, excellent for gluing and painting.', kerf: 0.20 },
  { name: 'Acrylic', color: '#2dd4bf', value: 'acrylic', description: 'Rigid transparent thermoplastic. Smooth polished laser-flame edges & high friction-fit accuracy.', kerf: 0.05 },
  { name: 'Birch Plywood', color: '#e2ba8c', value: 'birch', description: 'Classic multi-layer wood. Exceptional strength, lightweight, and natural warm grain.', kerf: 0.10 },
  { name: 'Bamboo', color: '#ecdbb4', value: 'bamboo', description: 'Highly sustainable, dense structural grass. Beautiful striped grain, strong and durable.', kerf: 0.08 }
];

export default function App() {
  // Current active CAD state
  const [params, setParams] = useState<BoxParams>({
    width: 150,
    height: 100,
    depth: 120,
    thickness: 3.0,
    fingerWidth: 12.0,
    laserKerf: 0.20,
    boxType: 'closed',
    lidType: 'sliding',
    hasEnvelopeSlot: false,
    envelopeSlotWidth: 150,
    envelopeSlotThickness: 6
  });

  // Local typed states for numeric inputs to allow smooth typing without instant strict bounding
  const [localWidth, setLocalWidth] = useState(params.width.toString());
  const [localHeight, setLocalHeight] = useState(params.height.toString());
  const [localDepth, setLocalDepth] = useState(params.depth.toString());
  const [localThickness, setLocalThickness] = useState(params.thickness.toString());
  const [localFingerWidth, setLocalFingerWidth] = useState(params.fingerWidth.toString());
  const [localLaserKerf, setLocalLaserKerf] = useState(params.laserKerf.toString());

  useEffect(() => {
    setLocalWidth(params.width.toString());
  }, [params.width]);

  useEffect(() => {
    setLocalHeight(params.height.toString());
  }, [params.height]);

  useEffect(() => {
    setLocalDepth(params.depth.toString());
  }, [params.depth]);

  useEffect(() => {
    setLocalThickness(params.thickness.toString());
  }, [params.thickness]);

  useEffect(() => {
    setLocalFingerWidth(params.fingerWidth.toString());
  }, [params.fingerWidth]);

  useEffect(() => {
    setLocalLaserKerf(params.laserKerf.toString());
  }, [params.laserKerf]);

  const handleWidthChange = (valStr: string) => {
    setLocalWidth(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('width', Math.max(10, num));
    }
  };

  const handleWidthBlur = () => {
    const num = parseFloat(localWidth);
    if (isNaN(num) || num < 20) {
      updateParam('width', 20);
      setLocalWidth('20');
    } else if (num > 2000) {
      updateParam('width', 2000);
      setLocalWidth('2000');
    } else {
      updateParam('width', Math.round(num * 10) / 10);
      setLocalWidth((Math.round(num * 10) / 10).toString());
    }
  };

  const handleHeightChange = (valStr: string) => {
    setLocalHeight(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('height', Math.max(10, num));
    }
  };

  const handleHeightBlur = () => {
    const num = parseFloat(localHeight);
    if (isNaN(num) || num < 20) {
      updateParam('height', 20);
      setLocalHeight('20');
    } else if (num > 2000) {
      updateParam('height', 2000);
      setLocalHeight('2000');
    } else {
      updateParam('height', Math.round(num * 10) / 10);
      setLocalHeight((Math.round(num * 10) / 10).toString());
    }
  };

  const handleDepthChange = (valStr: string) => {
    setLocalDepth(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('depth', Math.max(10, num));
    }
  };

  const handleDepthBlur = () => {
    const num = parseFloat(localDepth);
    if (isNaN(num) || num < 20) {
      updateParam('depth', 20);
      setLocalDepth('20');
    } else if (num > 2000) {
      updateParam('depth', 2000);
      setLocalDepth('2000');
    } else {
      updateParam('depth', Math.round(num * 10) / 10);
      setLocalDepth((Math.round(num * 10) / 10).toString());
    }
  };

  const handleThicknessChange = (valStr: string) => {
    setLocalThickness(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('thickness', Math.max(0.1, num));
    }
  };

  const handleThicknessBlur = () => {
    const num = parseFloat(localThickness);
    if (isNaN(num) || num < 0.5) {
      updateParam('thickness', 0.5);
      setLocalThickness('0.5');
    } else if (num > 50) {
      updateParam('thickness', 50);
      setLocalThickness('50');
    } else {
      updateParam('thickness', Math.round(num * 100) / 100);
      setLocalThickness((Math.round(num * 100) / 100).toString());
    }
  };

  const handleFingerWidthChange = (valStr: string) => {
    setLocalFingerWidth(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('fingerWidth', Math.max(2, num));
    }
  };

  const handleFingerWidthBlur = () => {
    const num = parseFloat(localFingerWidth);
    if (isNaN(num) || num < 2) {
      updateParam('fingerWidth', 2);
      setLocalFingerWidth('2');
    } else if (num > 200) {
      updateParam('fingerWidth', 200);
      setLocalFingerWidth('200');
    } else {
      updateParam('fingerWidth', Math.round(num * 10) / 10);
      setLocalFingerWidth((Math.round(num * 10) / 10).toString());
    }
  };

  const handleLaserKerfChange = (valStr: string) => {
    setLocalLaserKerf(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      updateParam('laserKerf', Math.max(-1.0, Math.min(1.0, num)));
    }
  };

  const handleLaserKerfBlur = () => {
    const num = parseFloat(localLaserKerf);
    if (isNaN(num)) {
      updateParam('laserKerf', 0);
      setLocalLaserKerf('0');
    } else if (num < -1.0) {
      updateParam('laserKerf', -1.0);
      setLocalLaserKerf('-1');
    } else if (num > 1.0) {
      updateParam('laserKerf', 1.0);
      setLocalLaserKerf('1');
    } else {
      updateParam('laserKerf', Math.round(num * 1000) / 1000);
      setLocalLaserKerf((Math.round(num * 1000) / 1000).toString());
    }
  };

  const [activeTab, setActiveTab] = useState<'3d' | '2d'>('3d');
  const [explode, setExplode] = useState<number>(0);
  const [selectedWood, setSelectedWood] = useState('mdf');
  const [showLabels, setShowLabels] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Auto generated panels based on parameters
  const [panels, setPanels] = useState<PanelData[]>([]);

  // Safety nesting layout spacing
  const [nestingSpacing, setNestingSpacing] = useState<number>(8);
  const [sheetWidth, setSheetWidth] = useState<number>(600);
  const [sheetHeight, setSheetHeight] = useState<number>(400);

  // Traced engraving state
  interface EngravingConfig {
    id: string;
    name: string;
    imgData: ImageData;
    imgDims: { w: number; h: number };
    panelId: string;
    panelIds?: string[];
    scale: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
    traceThreshold: number;
    traceInvert: boolean;
    traceSmoothing: number;
    traceCenterline: boolean;
  }

  const [engravings, setEngravings] = useState<EngravingConfig[]>([]);
  const [activeEngravingId, setActiveEngravingId] = useState<string | null>(null);
  const [engravedPathsMap, setEngravedPathsMap] = useState<Record<string, Point2D[][]>>({});

  // Auto stencil bridge controls
  const [enableBridges, setEnableBridges] = useState<boolean>(false);
  const [bridgeWidth, setBridgeWidth] = useState<number>(2.0); // mm
  const [bridgeType, setBridgeType] = useState<'global' | 'per_island'>('per_island');
  const [globalBridgeDir, setGlobalBridgeDir] = useState<'vertical' | 'horizontal' | 'cross' | 'double_vertical' | 'double_horizontal'>('cross');
  const [islandBridgeMode, setIslandBridgeMode] = useState<'island_top' | 'island_bottom' | 'island_left' | 'island_right' | 'island_top_bottom' | 'island_left_right' | 'island_all_four'>('island_all_four');
  const [bridgeJitter, setBridgeJitter] = useState<number>(15);

  // Normalization, centering, positioning, scaling for engrave vector paths on wood panels
  const getScaledAndPositionedEngravePaths = (
    rawPaths: Point2D[][],
    imgW: number,
    imgH: number,
    panelW: number,
    panelH: number,
    scalePercent: number,
    offX: number,
    offY: number,
    rotationDeg: number
  ): Point2D[][] => {
    if (rawPaths.length === 0 || imgW <= 0 || imgH <= 0 || panelW <= 0 || panelH <= 0) {
      return [];
    }

    // Find the bounding box of the raw paths
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawPaths.forEach((path) => {
      path.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    if (minX === Infinity) {
      minX = 0; maxX = imgW;
      minY = 0; maxY = imgH;
    }

    const rawW = maxX - minX;
    const rawH = maxY - minY;
    if (rawW <= 0 || rawH <= 0) return [];

    // Determine scale factor to fit within requested percentage of panel size
    const maxEngraveW = panelW * (scalePercent / 100);
    const maxEngraveH = panelH * (scalePercent / 100);
    const scale = Math.min(maxEngraveW / rawW, maxEngraveH / rawH);

    // Center of panel
    const panelCenterX = panelW / 2;
    const panelCenterY = panelH / 2;

    // Center of raw bounding box
    const rawCenterX = minX + rawW / 2;
    const rawCenterY = minY + rawH / 2;

    const angleRad = (rotationDeg * Math.PI) / 180;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    // Map each point
    return rawPaths.map((path) =>
      path.map((pt) => {
        // Local translation around the artwork's center point
        const localX = pt.x - rawCenterX;
        const localY = pt.y - rawCenterY;

        // Perform rotation in 2D
        const rotX = localX * cosAngle - localY * sinAngle;
        const rotY = localX * sinAngle + localY * cosAngle;

        return {
          x: panelCenterX + rotX * scale + offX,
          y: panelCenterY + rotY * scale + offY,
        };
      })
    );
  };

  // Trace images to paths when config or global bridge parameters change
  useEffect(() => {
    const newPathsMap: Record<string, Point2D[][]> = {};
    engravings.forEach((eng) => {
      try {
        const paths = traceImage(
          eng.imgData,
          eng.traceThreshold,
          eng.traceInvert,
          eng.traceSmoothing,
          enableBridges,
          bridgeWidth,
          bridgeType,
          bridgeType === 'global' ? globalBridgeDir : undefined,
          bridgeType === 'per_island' ? islandBridgeMode : undefined,
          bridgeJitter,
          eng.traceCenterline
        );
        newPathsMap[eng.id] = paths;
      } catch (err) {
        console.error('Error tracing image:', eng.name, err);
        newPathsMap[eng.id] = [];
      }
    });
    setEngravedPathsMap(newPathsMap);
  }, [engravings, enableBridges, bridgeWidth, bridgeType, globalBridgeDir, islandBridgeMode, bridgeJitter]);

  useEffect(() => {
    // Generate panels on parameter changes
    const generated = generateBoxPanels(params);
    
    // Apply all engravings to their respective panels
    const updated = generated.map((panel) => {
      const panelEngravings = engravings.filter((eng) => 
        (eng.panelIds && eng.panelIds.includes(panel.id)) || eng.panelId === panel.id
      );
      if (panelEngravings.length > 0) {
        let combinedPaths: Point2D[][] = [];
        panelEngravings.forEach((eng) => {
          const rawPaths = engravedPathsMap[eng.id];
          if (rawPaths && rawPaths.length > 0) {
            const scaled = getScaledAndPositionedEngravePaths(
              rawPaths,
              eng.imgDims.w,
              eng.imgDims.h,
              panel.width,
              panel.height,
              eng.scale,
              eng.offsetX,
              eng.offsetY,
              eng.rotation
            );
            combinedPaths = combinedPaths.concat(scaled);
          }
        });
        return {
          ...panel,
          engravePaths: combinedPaths
        };
      }
      return panel;
    });
    setPanels(updated);
  }, [params, engravings, engravedPathsMap]);

  const loadPreset = (preset: Preset) => {
    setParams({
      width: preset.width,
      height: preset.height,
      depth: preset.depth,
      thickness: preset.thickness,
      fingerWidth: preset.fingerWidth,
      laserKerf: preset.laserKerf,
      boxType: preset.boxType,
      lidType: 'sliding',
      hasEnvelopeSlot: preset.hasEnvelopeSlot || false,
      envelopeSlotWidth: preset.envelopeSlotWidth || 150,
      envelopeSlotThickness: preset.envelopeSlotThickness || 6
    });
    setExplode(0);
    triggerFeedback(`Loaded Preset: ${preset.name}`, 'success');
  };

  const triggerFeedback = (text: string, type: 'success' | 'info' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Triggers immediate standard file downloads in client
  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSVG = () => {
    try {
      const svgContent = exportToSVG(panels, params, nestingSpacing, sheetWidth, sheetHeight);
      const filename = `laser_box_${params.width}x${params.height}x${params.depth}_${params.boxType}.svg`;
      triggerDownload(filename, svgContent, 'image/svg+xml');
      triggerFeedback('SVG Template downloaded successfully!', 'success');
    } catch (err) {
      triggerFeedback('Error exporting SVG.', 'info');
    }
  };

  const handleExportDXF = () => {
    try {
      const dxfContent = exportToDXF(panels, nestingSpacing, sheetWidth, sheetHeight);
      const filename = `laser_box_${params.width}x${params.height}x${params.depth}_${params.boxType}.dxf`;
      triggerDownload(filename, dxfContent, 'image/vnd.dxf');
      triggerFeedback('DXF Template downloaded successfully!', 'success');
    } catch (err) {
      triggerFeedback('Error exporting DXF.', 'info');
    }
  };

  const handleSendToStaff = (senderName: string, senderEmail: string, notes: string) => {
    try {
      const svgContent = exportToSVG(panels, params, nestingSpacing, sheetWidth, sheetHeight);
      const TARGET_URL = 'https://kapiti-makerspace-laser-driver.vercel.app/';
      
      // 1. Open the laser cutter website in a new tab
      const laserWin = window.open(TARGET_URL, '_blank');
      
      if (!laserWin) {
        triggerFeedback('Popup was blocked! Please enable popups for this site.', 'info');
        return;
      }

      // 2. Prepare the payload matching the Kapiti Laser specifications
      const payload = {
        type: 'kapiti-laser-import',
        action: 'load-svg',
        svg: svgContent, // Raw SVG markup string
        filename: 'design.svg',
        fileName: 'design.svg',
        senderName: senderName || 'External App User',
        senderEmail: senderEmail || '',
        notes: notes || '',
        svgString: svgContent,
        data: svgContent
      };

      triggerFeedback('Opening Laser Driver and streaming design to staff...', 'success');

      // 3. Repeatedly broadcast the message as the target site loads
      let attempts = 0;
      const interval = setInterval(() => {
        if (laserWin.closed) {
          clearInterval(interval);
          return;
        }
        
        laserWin.postMessage(payload, TARGET_URL);
        attempts++;
        
        // Stop broadcasting after 6 seconds (10 attempts)
        if (attempts >= 10) {
          clearInterval(interval);
        }
      }, 600);
    } catch (err) {
      triggerFeedback('Error preparing layout transfer.', 'info');
    }
  };

  const updateParam = (key: keyof BoxParams, val: number | string | boolean) => {
    setParams((prev) => ({
      ...prev,
      [key]: val
    }));
  };

  const updateActiveEngraving = (fields: Partial<EngravingConfig>) => {
    if (!activeEngravingId) return;
    setEngravings((prev) =>
      prev.map((eng) => (eng.id === activeEngravingId ? { ...eng, ...fields } : eng))
    );
  };

  const handleMaterialChange = (materialValue: string) => {
    setSelectedWood(materialValue);
    const selectedMat = WOOD_TYPES.find((w) => w.value === materialValue);
    if (selectedMat) {
      setParams((prev) => ({
        ...prev,
        laserKerf: selectedMat.kerf
      }));
      triggerFeedback(`Material changed to ${selectedMat.name}. Ideal kerf updated to ${selectedMat.kerf}mm.`, 'success');
    }
  };

  // Material wood colors lookup
  const currentWoodColor = WOOD_TYPES.find((w) => w.value === selectedWood)?.color || '#e0b98a';

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden select-none">
      
      {/* Top Professional Header Bar */}
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-md text-lg border border-blue-400 select-none">
            K
          </div>
          <div>
            <p className="text-[9px] text-blue-600 font-extrabold uppercase tracking-[0.18em] leading-none mb-1">
              KĀPITI LIBRARIES
            </p>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              BOXSMITH <span className="text-blue-600 font-mono text-[10px] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">v2.5.0</span>
            </h1>
          </div>
        </div>

        {/* CAD Preset Quick Picker */}
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-extrabold text-slate-500 px-2 uppercase tracking-widest flex items-center gap-1">
            <Sparkle className="w-3.5 h-3.5 text-blue-600" /> Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset)}
              className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 transition-all cursor-pointer border border-slate-200 hover:border-slate-300 active:scale-95 shadow-sm"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setParams({
                width: 150,
                height: 100,
                depth: 120,
                thickness: 3.0,
                fingerWidth: 12.0,
                laserKerf: 0.20,
                boxType: 'closed',
                lidType: 'sliding'
              });
              setExplode(0);
              triggerFeedback("Project workspace reset to defaults", "info");
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Reset to defaults"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* Feedback Toast Notice */}
      {feedbackMsg && (
        <div className="fixed top-16 right-6 z-50 bg-white border border-slate-200 p-4 rounded-xl shadow-md max-w-sm flex items-center gap-3 animate-slide-in">
          <span className="bg-blue-50 p-1 rounded-full text-blue-600 border border-blue-100">
            <Check className="w-4 h-4" />
          </span>
          <p className="text-xs font-bold text-slate-800">{feedbackMsg.text}</p>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex flex-grow flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden bg-slate-50">
        
        {/* Left Sidepanel: Precision Parameters Editor */}
        <aside className="w-full lg:w-[320px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-5 gap-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
          
          {/* Header */}
          <div>
            <label className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest block mb-2 border-b border-slate-200 pb-2">
              Parameters Spec
            </label>
          </div>

          {/* Sizing Parameters Card Group */}
          <div className="flex flex-col gap-5">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Ruler className="w-3.5 h-3.5 text-blue-600" /> Box Dimensions (mm)
            </h3>
            
            {/* Width X */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-650">Outer Width (X)</span>
                <input
                  type="number"
                  min="20"
                  max="2000"
                  value={localWidth}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  onBlur={handleWidthBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="1"
                value={params.width}
                onChange={(e) => updateParam('width', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Height Y */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-650">Outer Height (Y)</span>
                <input
                  type="number"
                  min="20"
                  max="2000"
                  value={localHeight}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  onBlur={handleHeightBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="40"
                max="400"
                step="1"
                value={params.height}
                onChange={(e) => updateParam('height', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Depth Z */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-650">Outer Depth (Z)</span>
                <input
                  type="number"
                  min="20"
                  max="2000"
                  value={localDepth}
                  onChange={(e) => handleDepthChange(e.target.value)}
                  onBlur={handleDepthBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="1"
                value={params.depth}
                onChange={(e) => updateParam('depth', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Joinery & Materials Spec */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Scissors className="w-3.5 h-3.5 text-blue-600" /> Material Properties
            </h3>

            {/* Material Preset Picker */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-2 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Select Material</span>
              <div className="flex flex-col gap-1.5">
                {WOOD_TYPES.map((wood) => {
                  const isSelected = selectedWood === wood.value;
                  return (
                    <button
                      key={wood.value}
                      onClick={() => handleMaterialChange(wood.value)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-full shrink-0 border transition-transform ${
                            isSelected ? 'border-blue-600 scale-110 shadow-sm' : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: wood.color }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate leading-snug">{wood.name}</span>
                          <span className="text-[9px] text-slate-500 truncate leading-none mt-0.5">
                            Optimal Kerf: {wood.kerf.toFixed(2)}mm
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-150 mt-0.5">
                {WOOD_TYPES.find((w) => w.value === selectedWood)?.description}
              </p>
            </div>

            {/* Material Thick */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-650">Thickness (T)</span>
                <input
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.1"
                  value={localThickness}
                  onChange={(e) => handleThicknessChange(e.target.value)}
                  onBlur={handleThicknessBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.1"
                value={params.thickness}
                onChange={(e) => updateParam('thickness', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
              <div className="flex gap-1.5 mt-2">
                {[3.0, 4.0, 5.0, 6.0].map((th) => (
                  <button
                    key={th}
                    onClick={() => updateParam('thickness', th)}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      params.thickness === th
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {th.toFixed(1)}mm
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Finger size */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-650">Finger Joint (W)</span>
                <input
                  type="number"
                  min="2"
                  max="200"
                  value={localFingerWidth}
                  onChange={(e) => handleFingerWidthChange(e.target.value)}
                  onBlur={handleFingerWidthBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={params.fingerWidth}
                onChange={(e) => updateParam('fingerWidth', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Laser Kerf Offset */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-650">
                  Laser Kerf Offset
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" title="Friction-fit laser beam compensation" />
                </span>
                <input
                  type="number"
                  min="-1.00"
                  max="1.00"
                  step="0.01"
                  value={localLaserKerf}
                  onChange={(e) => handleLaserKerfChange(e.target.value)}
                  onBlur={handleLaserKerfBlur}
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 text-right focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <input
                type="range"
                min="-1.00"
                max="1.00"
                step="0.01"
                value={params.laserKerf}
                onChange={(e) => updateParam('laserKerf', Number(e.target.value))}
                className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Envelope Slot Options */}
          {params.boxType !== 'open-top' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkle className="w-3.5 h-3.5 text-blue-600" /> Envelope & Money Slot
              </h3>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-750">Enable Envelope Slot</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!params.hasEnvelopeSlot}
                      onChange={(e) => updateParam('hasEnvelopeSlot', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {params.hasEnvelopeSlot && (
                  <div className="flex flex-col gap-4 mt-2 pt-2 border-t border-slate-100">
                    {/* Slot Width Slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-slate-500">Slot Width (mm)</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{params.envelopeSlotWidth || 150}mm</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max={Math.max(55, params.width - 24)}
                        step="1"
                        value={params.envelopeSlotWidth || 130}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateParam('envelopeSlotWidth', val);
                        }}
                        className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>

                    {/* Slot Thickness Slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-slate-500">Slot Thickness (mm)</span>
                        <span className="text-xs font-mono font-bold text-blue-600">{params.envelopeSlotThickness || 6}mm</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={params.envelopeSlotThickness || 6}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateParam('envelopeSlotThickness', val);
                        }}
                        className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Punches a high-precision center slot through the lid/top panel. Perfect for weddings, coin collections, or donation containers.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Laser Joint Style Selector */}
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest block border-b border-slate-200 pb-2">
              Joint Interface Configuration
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'closed',
                  title: 'Closed Interlocking Box',
                  desc: 'All 6 interlocking faces are joint-connected.'
                },
                {
                  id: 'open-top',
                  title: 'Open Top Tray',
                  desc: '5-sided open container with clean flat top edges.'
                },
                {
                  id: 'removable-lid',
                  title: 'Fitted Removable Lid',
                  desc: 'Choose from 4 custom removable lid profiles.'
                }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateParam('boxType', style.id as BoxParams['boxType'])}
                  className={`text-left p-3 rounded-lg border transition-all text-xs cursor-pointer flex flex-col gap-0.5 active:scale-98 shadow-sm ${
                    params.boxType === style.id
                      ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-extrabold flex items-center justify-between text-[12px]">
                    {style.title}
                    {params.boxType === style.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </span>
                  <span className="text-slate-500 text-[10px] leading-relaxed mt-0.5">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sizable 4-Type Removable Lid Picker */}
          {params.boxType === 'removable-lid' && (
            <div className="flex flex-col gap-3.5 bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-sm">
              <label className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Select Lid Fitting Type:
              </label>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {[
                  {
                    id: 'sliding',
                    name: 'Grooved Slide-In Lid',
                    desc: 'Clean solid walls. Slides through custom Inner Slider Plates!'
                  },
                  {
                    id: 'hinged',
                    name: 'Swivel Peg-Hinged Lid',
                    desc: 'Joint rotates on side sockets with ear tabs.'
                  }
                ].map((lid) => (
                  <button
                    key={lid.id}
                    onClick={() => updateParam('lidType', lid.id as any)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer flex flex-col gap-1 ${
                      (params.lidType || 'sliding') === lid.id
                        ? 'bg-white border-blue-500 text-slate-900 font-extrabold shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-extrabold flex items-center justify-between text-[11px] leading-none">
                      {lid.name}
                      {(params.lidType || 'sliding') === lid.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </span>
                    <span className="text-slate-500 text-[10px] leading-normal">{lid.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Laser Engraving Trace Add-On */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Image className="w-3.5 h-3.5 text-blue-600" /> Laser Engraving (Add-On)
            </h3>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex flex-col gap-4 shadow-sm">
              {/* File Upload Trigger (Always available to add more images) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700">Add New Image to Trace</span>
                <label className="flex flex-col items-center justify-center border border-dashed border-blue-250 hover:border-blue-500 bg-white rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50 group shadow-sm">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-850">Choose an image file</span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">PNG, JPG, BMP, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = document.createElement('img');
                          img.src = event.target?.result as string;
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_DIM = 400;
                            let w = img.width;
                            let h = img.height;
                            if (w > MAX_DIM || h > MAX_DIM) {
                              if (w > h) {
                                h = Math.round((h * MAX_DIM) / w);
                                w = MAX_DIM;
                              } else {
                                w = Math.round((w * MAX_DIM) / h);
                                h = MAX_DIM;
                              }
                            }
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, w, h);
                              const imgData = ctx.getImageData(0, 0, w, h);
                              const newEngraving: EngravingConfig = {
                                id: Date.now().toString(),
                                name: file.name,
                                imgData,
                                imgDims: { w, h },
                                panelId: 'top', // Default to top panel
                                panelIds: ['top'],
                                scale: 60,
                                offsetX: 0,
                                offsetY: 0,
                                rotation: 0,
                                traceThreshold: 128,
                                traceInvert: false,
                                traceSmoothing: 2,
                                traceCenterline: false
                              };
                              setEngravings((prev) => [...prev, newEngraving]);
                              setActiveEngravingId(newEngraving.id);
                              triggerFeedback('Image successfully added for vector engraving!', 'success');
                            }
                          };
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* List of engravings */}
              {engravings.length > 0 && (
                <div className="flex flex-col gap-2 border-b border-blue-100 pb-3">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Engraved Images ({engravings.length})</span>
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                    {engravings.map((eng) => {
                      const isActive = eng.id === activeEngravingId;
                      return (
                        <div
                          key={eng.id}
                          onClick={() => setActiveEngravingId(eng.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded border flex items-center justify-center shrink-0 ${isActive ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                              <Image className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                            </div>                             <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold truncate leading-tight">{eng.name}</span>
                              <span className="text-[9px] text-slate-500 leading-none mt-0.5 uppercase font-mono">
                                Panels: <span className="text-blue-600 font-bold">{(eng.panelIds && eng.panelIds.length > 0) ? eng.panelIds.join(', ') : eng.panelId}</span> • {eng.scale}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-0.5 shrink-0 ml-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const dupId = Date.now().toString() + Math.round(Math.random() * 1000).toString();
                                const duplicate: EngravingConfig = {
                                  ...eng,
                                  id: dupId,
                                  name: `${eng.name} (Copy)`,
                                  panelIds: [...(eng.panelIds || [eng.panelId])],
                                };
                                setEngravings((prev) => [...prev, duplicate]);
                                setActiveEngravingId(dupId);
                                triggerFeedback(`Duplicated ${eng.name} configuration`, 'success');
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-blue-600 transition-all cursor-pointer"
                              title="Duplicate artwork config"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEngravings((prev) => prev.filter((item) => item.id !== eng.id));
                                if (isActive) {
                                  const remaining = engravings.filter((item) => item.id !== eng.id);
                                  setActiveEngravingId(remaining.length > 0 ? remaining[0].id : null);
                                }
                                triggerFeedback('Removed engraved artwork', 'info');
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete artwork"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Only show active engraving configurations if one is selected */}
              {engravings.length > 0 && (
                <div className="flex flex-col gap-4 mt-1 pt-3 border-t border-blue-100">
                  {(() => {
                    const activeEng = engravings.find((e) => e.id === activeEngravingId);
                    if (!activeEng) {
                      return (
                        <p className="text-[10px] text-slate-500 text-center py-2">
                          Select an image above to edit its parameters.
                        </p>
                      );
                    }

                    const rawPathsLength = (engravedPathsMap[activeEng.id] || []).length;

                    return (
                      <div className="flex flex-col gap-4">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-0.5">
                          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Editing Image Settings</span>
                          <span className="text-xs font-bold text-slate-750 truncate">{activeEng.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {activeEng.imgDims.w}x{activeEng.imgDims.h}px ({rawPathsLength} loops)
                          </span>
                        </div>

                    {/* Target Panels Checkbox Grid */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-slate-500">Engrave On Panels</span>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tracking-wider uppercase">Multi-Select</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {panels
                          .filter((p) => ['top', 'bottom', 'front', 'back', 'left', 'right'].includes(p.id))
                          .map((p) => {
                            const currentIds = activeEng.panelIds || (activeEng.panelId ? [activeEng.panelId] : []);
                            const isChecked = currentIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-50/70 border-blue-400 text-slate-900 font-semibold shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let nextIds = [...currentIds];
                                    if (e.target.checked) {
                                      if (!nextIds.includes(p.id)) {
                                        nextIds.push(p.id);
                                      }
                                    } else {
                                      nextIds = nextIds.filter((id) => id !== p.id);
                                    }
                                    updateActiveEngraving({
                                      panelIds: nextIds,
                                      panelId: nextIds[0] || ''
                                    });
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] leading-tight capitalize truncate">{p.name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{p.width}x{p.height}mm</span>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                  {/* Artwork Scale Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500">Artwork Size (Scale)</span>
                      <span className="text-xs font-mono font-bold text-blue-600">{activeEng.scale}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={activeEng.scale}
                      onChange={(e) => updateActiveEngraving({ scale: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Artwork Rotation Slider and Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500">Artwork Rotation</span>
                      <div className="flex items-center gap-1 bg-white px-1 py-0.5 rounded border border-slate-200 shadow-sm">
                        <input
                          type="number"
                          min="-360"
                          max="360"
                          step="1"
                          value={activeEng.rotation}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveEngraving({ rotation: isNaN(val) ? 0 : val });
                          }}
                          className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] font-bold text-slate-400 pr-1">°</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={((activeEng.rotation % 360) + 360) % 360}
                      onChange={(e) => updateActiveEngraving({ rotation: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Offset X Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500">Position Offset X (mm)</span>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {activeEng.offsetX > 0 ? `+${activeEng.offsetX}` : activeEng.offsetX}mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      step="1"
                      value={activeEng.offsetX}
                      onChange={(e) => updateActiveEngraving({ offsetX: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Offset Y Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500">Position Offset Y (mm)</span>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {activeEng.offsetY > 0 ? `+${activeEng.offsetY}` : activeEng.offsetY}mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      step="1"
                      value={activeEng.offsetY}
                      onChange={(e) => updateActiveEngraving({ offsetY: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Vectorization Threshold Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        Trace Threshold
                        <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded">Light/Dark</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600">{activeEng.traceThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="245"
                      step="1"
                      value={activeEng.traceThreshold}
                      onChange={(e) => updateActiveEngraving({ traceThreshold: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Curve Smoothing */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-500">Curve Smoothing</span>
                      <span className="text-xs font-mono font-bold text-blue-600">Level {activeEng.traceSmoothing}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={activeEng.traceSmoothing}
                      onChange={(e) => updateActiveEngraving({ traceSmoothing: Number(e.target.value) })}
                      className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  {/* Invert Brightness Toggle */}
                  <div className="flex items-center justify-between py-1 bg-white px-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500">Invert Image Trace</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeEng.traceInvert}
                        onChange={(e) => updateActiveEngraving({ traceInvert: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white animate-transition"></div>
                    </label>
                  </div>

                  {/* Centerline Tracing Toggle */}
                  <div className="flex items-center justify-between py-1 bg-white px-2 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-500">Trace Centerline</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Extract single-pixel center skeleton</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeEng.traceCenterline}
                        onChange={(e) => updateActiveEngraving({ traceCenterline: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white animate-transition"></div>
                    </label>
                  </div>
                </div>
              );
            })()}
                  {/* Auto Stencil Bridges Section */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-700">Enable Stencil Bridges</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBridges}
                          onChange={(e) => setEnableBridges(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                      </label>
                    </div>

                    {enableBridges && (
                      <div className="flex flex-col gap-3.5 mt-1 pt-2 border-t border-slate-100">
                        {/* Bridge Width */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold text-slate-500">Bridge Width (mm)</span>
                            <span className="text-[11px] font-mono font-bold text-blue-600">{bridgeWidth.toFixed(1)}mm</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="8.0"
                            step="0.1"
                            value={bridgeWidth}
                            onChange={(e) => setBridgeWidth(Number(e.target.value))}
                            className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                          />
                        </div>

                        {/* Bridge Placement Type */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500">Bridge Placement Algorithm</span>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <button
                              onClick={() => setBridgeType('per_island')}
                              className={`py-1 rounded border text-center font-bold transition-all cursor-pointer ${
                                bridgeType === 'per_island'
                                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm'
                              }`}
                            >
                              Island (Letters)
                            </button>
                            <button
                              onClick={() => setBridgeType('global')}
                              className={`py-1 rounded border text-center font-bold transition-all cursor-pointer ${
                                bridgeType === 'global'
                                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm'
                              }`}
                            >
                              Global grid
                            </button>
                          </div>
                        </div>

                        {/* Mode parameters based on Type selection */}
                        {bridgeType === 'per_island' ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-500">Island Anchors</span>
                            <select
                              value={islandBridgeMode}
                              onChange={(e) => setIslandBridgeMode(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer shadow-sm"
                            >
                              <option value="island_all_four">All Four Extreme Points</option>
                              <option value="island_top_bottom">Top & Bottom Only</option>
                              <option value="island_left_right">Left & Right Only</option>
                              <option value="island_top">Top Only</option>
                              <option value="island_bottom">Bottom Only</option>
                              <option value="island_left">Left Only</option>
                              <option value="island_right">Right Only</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-500">Global Grid lines</span>
                            <select
                              value={globalBridgeDir}
                              onChange={(e) => setGlobalBridgeDir(e.target.value as any)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer shadow-sm"
                            >
                              <option value="cross">Cross Grid (+)</option>
                              <option value="vertical">Single Center Vertical (|)</option>
                              <option value="horizontal">Single Center Horizontal (—)</option>
                              <option value="double_vertical">Double Vertical (||)</option>
                              <option value="double_horizontal">Double Horizontal (==)</option>
                            </select>
                          </div>
                        )}

                        {/* Bridge Placement Jitter */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold text-slate-500">Position Stagger (Jitter)</span>
                            <span className="text-[11px] font-mono font-bold text-blue-600">{bridgeJitter}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={bridgeJitter}
                            onChange={(e) => setBridgeJitter(Number(e.target.value))}
                            className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Panel Drawer */}
          <div className="mt-auto p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex flex-col gap-3 shadow-sm">
            <span className="text-[10px] font-extrabold text-blue-700 tracking-widest uppercase">QUICK EXPORTS</span>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleExportSVG}
                className="py-2.5 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider rounded-lg border border-slate-200 hover:border-blue-300 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                SVG
              </button>
              <button
                onClick={handleExportDXF}
                className="py-2.5 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider rounded-lg border border-slate-200 hover:border-blue-300 shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-blue-600" />
                DXF
              </button>
            </div>
          </div>
          
        </aside>

        {/* Right Pane: Interactive WebGL Stage View & Flat pack sheets */}
        <section className="flex-grow flex flex-col min-w-0 bg-white p-6 gap-5 overflow-y-auto">
          
          {/* Main Visual Workspace Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-250 pb-3 shrink-0">
            
            {/* Tab switch styling */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 select-none">
              <button
                onClick={() => setActiveTab('3d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === '3d'
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/20 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Box className="w-4 h-4" />
                Design Assembly View
              </button>
              <button
                onClick={() => setActiveTab('2d')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === '2d'
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/20 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                2D Cut Layout Sheet
              </button>
            </div>

            {/* Workspace details info bubble */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1.5 px-3.5 rounded-lg text-xs font-mono text-slate-600">
              <span className="text-slate-400 font-extrabold select-none">BOUNDS</span>
              <span>W:{params.width}</span>
              <span className="text-slate-300">|</span>
              <span>H:{params.height}</span>
              <span className="text-slate-300">|</span>
              <span>D:{params.depth} mm</span>
            </div>
          </div>

          {/* CAD Interactive Stage block */}
          <div className="flex-grow flex flex-col gap-5 min-h-0">
            {activeTab === '3d' ? (
              <div className="flex-grow flex flex-col gap-5 min-h-[440px]">
                
                {/* 3D Viewer Container */}
                <div className="flex-grow min-h-0 min-h-[440px] relative">
                  <ThreeBoxViewer
                    panels={panels}
                    params={params}
                    explode={explode}
                    showLabels={showLabels}
                    materialColor={currentWoodColor}
                    materialType={selectedWood}
                    wireframeMode={wireframe}
                  />
                </div>

                {/* Assembly Animation Controls shelf */}
                <div className="bg-white border border-slate-205 p-5 rounded-xl flex flex-col sm:flex-row gap-5 items-stretch sm:items-center justify-between shrink-0 shadow-sm select-none">
                  
                  {/* Explode range */}
                  <div className="flex-grow max-w-lg">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1.5 text-blue-600 font-bold uppercase tracking-wider text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" /> Orbit Assembly joint inspect
                      </span>
                      <span className="font-mono text-blue-600 font-bold">{explode}% exploded</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Closed</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={explode}
                        onChange={(e) => setExplode(Number(e.target.value))}
                        className="flex-grow h-1.5 accent-blue-650 bg-slate-100 rounded cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Exploded</span>
                    </div>
                  </div>

                  {/* Rendering customization options */}
                  <div className="flex flex-wrap gap-5 select-none shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-5">
                    
                    {/* Material simulation */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">3D Material Sim</span>
                      <div className="flex gap-1.5">
                        {WOOD_TYPES.map((wood) => (
                          <button
                            key={wood.value}
                            onClick={() => handleMaterialChange(wood.value)}
                            className={`w-6 h-6 rounded border transition-all cursor-pointer relative ${
                              selectedWood === wood.value
                                ? 'ring-2 ring-blue-500 border-white shadow-lg scale-110'
                                : 'border-slate-200 opacity-60 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: wood.color }}
                            title={wood.name}
                          >
                            {selectedWood === wood.value && (
                              <span className="block absolute inset-0.5 bg-white/20 rounded" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Show Labels toggle */}
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-650 hover:text-slate-800">
                        <input
                          type="checkbox"
                          checked={showLabels}
                          onChange={(e) => setShowLabels(e.target.checked)}
                          className="accent-blue-600 rounded border-slate-200 cursor-pointer"
                        />
                        Part Info
                      </label>
                    </div>

                    {/* Wireframe CAD look */}
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-650 hover:text-slate-800">
                        <input
                          type="checkbox"
                          checked={wireframe}
                          onChange={(e) => setWireframe(e.target.checked)}
                          className="accent-blue-600 rounded border-slate-200 cursor-pointer"
                        />
                        X-Ray CAD
                      </label>
                    </div>

                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-grow min-h-0 flex flex-col gap-4">
                {/* 2D Flat layouts nesting canvas */}
                <div className="flex-grow min-h-0">
                  <FlatSheetLayout
                    panels={panels}
                    spacing={nestingSpacing}
                    sheetWidth={sheetWidth}
                    sheetHeight={sheetHeight}
                    onSheetWidthChange={setSheetWidth}
                    onSheetHeightChange={setSheetHeight}
                    onExportSVG={handleExportSVG}
                    onExportDXF={handleExportDXF}
                    onSendToStaff={handleSendToStaff}
                  />
                </div>

                {/* Flat nesting parameters panel */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between shrink-0 shadow-sm select-none gap-4">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 max-w-xl">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Nesting margins prevent cross-scoring during laser cuts. Standard space is 6-10 mm.</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">Sheet Padding:</span>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={nestingSpacing}
                      onChange={(e) => setNestingSpacing(Math.max(1, Math.min(50, Number(e.target.value))))}
                      className="w-16 bg-white border border-slate-200 text-blue-600 font-extrabold font-mono text-center rounded py-1 px-1.5 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-sans tracking-wide">mm</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Artisan CAD Information Shelf */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-5 shadow-sm select-none">
            <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-200">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Pro-Tips &amp; Guide for Flawless Laser Cuts</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                When sending exported DXF/SVG scripts to laser cutters (like LightBurn, Glowforge, or Trotec):
              </p>
              <ul className="text-xs text-slate-600 mt-2.5 list-disc list-inside space-y-2 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Kerf Settings:</strong> Plywood usually burns away about 0.08mm to 0.15mm of wall thickness. Acrylic is cleaner at 0.05mm. Fine-tune parameters to get tight friction fits that snap together!
                </li>
                <li>
                  <strong className="text-slate-800">Sanding &amp; Finishes:</strong> Lightly sand parts on both sides to clear scorch marks or soot before final assembly.
                </li>
                <li>
                  <strong className="text-slate-800">Friction vs. Glue:</strong> With precise kerf, joints hold purely by friction. Add tiny dabs of wood glue inside joints for unbreakable structures.
                </li>
              </ul>
            </div>
          </div>

        </section>

      </div>

      {/* Solid AutoCAD Style Bottom Status Bar */}
      <footer className="h-6 bg-blue-600 flex items-center justify-between px-4 text-[10px] font-bold text-white shrink-0 select-none shadow-[inverted]">
        <div className="flex gap-4 items-center">
          <span className="bg-blue-800 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold tracking-wider">READY</span>
          <span className="opacity-90 font-mono tracking-wide uppercase">CAD_PROJECT: BOXSMITH_CASE_01.BSM</span>
        </div>
        <div className="flex gap-4 items-center font-mono">
          <span>GRID: MATCHED</span>
          <span>SNAP: AUTO</span>
          <span className="bg-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse border border-emerald-500" />
            GPU ACCEL: ACTIVE
          </span>
        </div>
      </footer>

    </div>
  );
}
