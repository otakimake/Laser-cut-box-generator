/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShapeCutoutConfig,
  ShapeCutoutType,
  PanelData,
  createRoundedRectPoints
} from '../lib/boxGeometry';
import {
  Scissors,
  Square,
  Circle,
  Plus,
  Trash2,
  Copy,
  Sliders,
  RotateCw,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Sparkles,
  Layers,
  Maximize2,
  Check,
  Zap,
  Info
} from 'lucide-react';

interface ShapeCutoutManagerProps {
  cutouts: ShapeCutoutConfig[];
  activeCutoutId: string | null;
  panels: PanelData[];
  onSelectCutout: (id: string | null) => void;
  onAddCutout: (cutout: ShapeCutoutConfig) => void;
  onUpdateCutout: (cutout: ShapeCutoutConfig) => void;
  onDeleteCutout: (id: string) => void;
  onDuplicateCutout: (id: string) => void;
  onTriggerFeedback?: (msg: string, type?: 'success' | 'info') => void;
}

export default function ShapeCutoutManager({
  cutouts,
  activeCutoutId,
  panels,
  onSelectCutout,
  onAddCutout,
  onUpdateCutout,
  onDeleteCutout,
  onDuplicateCutout,
  onTriggerFeedback
}: ShapeCutoutManagerProps) {
  const [lockAspect, setLockAspect] = useState<boolean>(false);

  const activeCutout = cutouts.find((c) => c.id === activeCutoutId) || null;

  // Compute maximum corner radius for active cutout
  const maxRadius = activeCutout
    ? Math.max(0, Math.min(activeCutout.width, activeCutout.height) / 2)
    : 0;

  const handleCreateDefaultCutout = (
    type: ShapeCutoutType = 'rectangle',
    customW = 40,
    customH = 25,
    customR = 5,
    namePrefix = 'Cutout'
  ) => {
    const newId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    const newCutout: ShapeCutoutConfig = {
      id: newId,
      name: `${namePrefix} #${cutouts.length + 1}`,
      shapeType: type,
      panelIds: ['top'],
      panelId: 'top',
      width: customW,
      height: customH,
      cornerRadius: customR,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      cutType: 'cut',
      polygonSides: 6,
      starPoints: 5,
      starInnerRatio: 0.45,
      enabled: true
    };
    onAddCutout(newCutout);
    onSelectCutout(newId);
    if (onTriggerFeedback) {
      onTriggerFeedback(`Added ${newCutout.name} with ${customR}mm corner radius`, 'success');
    }
  };

  const handleUpdate = (patch: Partial<ShapeCutoutConfig>) => {
    if (!activeCutout) return;
    const updated = { ...activeCutout, ...patch };

    // Auto-clamp corner radius if width or height changed
    if (patch.width !== undefined || patch.height !== undefined) {
      const allowedMaxR = Math.min(updated.width, updated.height) / 2;
      if (updated.cornerRadius > allowedMaxR) {
        updated.cornerRadius = Number(allowedMaxR.toFixed(1));
      }
    }

    onUpdateCutout(updated);
  };

  // Preset quick sizes
  const SIZE_PRESETS = [
    { label: '15×15', w: 15, h: 15, r: 3 },
    { label: '30×20', w: 30, h: 20, r: 4 },
    { label: '45×30', w: 45, h: 30, r: 6 },
    { label: '60×40', w: 60, h: 40, r: 8 },
    { label: '80×50', w: 80, h: 50, r: 10 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Title & Badge */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Scissors className="w-3.5 h-3.5 text-blue-600" /> Shape Cutouts & Apertures
        </h3>
        <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
          {cutouts.length} {cutouts.length === 1 ? 'Shape' : 'Shapes'}
        </span>
      </div>

      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex flex-col gap-4 shadow-sm">
        {/* Quick Add Presets Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">Add Shape Cutout</span>
            <span className="text-[9px] text-slate-400 font-sans">With Corner Radius</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleCreateDefaultCutout('rectangle', 40, 25, 5, 'Rounded Window')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Rounded Rectangle with adjustable corner radius"
            >
              <div className="w-3.5 h-3.5 border border-blue-600 rounded-xs group-hover:scale-110 transition-transform" />
              <span className="text-[10px] leading-tight">Rounded Rect</span>
            </button>

            <button
              onClick={() => handleCreateDefaultCutout('slot', 50, 16, 8, 'Vent Slot')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Pill / Capsule vent slot"
            >
              <div className="w-4 h-2 border border-blue-600 rounded-full group-hover:scale-110 transition-transform" />
              <span className="text-[10px] leading-tight">Pill Slot</span>
            </button>

            <button
              onClick={() => handleCreateDefaultCutout('circle', 30, 30, 0, 'Circular Port')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Circle or Ellipse hole"
            >
              <Circle className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] leading-tight">Circle / Port</span>
            </button>

            <button
              onClick={() => handleCreateDefaultCutout('rectangle', 30, 30, 0, 'Sharp Square')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Sharp Corner Rectangle (0mm radius)"
            >
              <Square className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] leading-tight">Sharp Rect</span>
            </button>

            <button
              onClick={() => handleCreateDefaultCutout('polygon', 36, 36, 0, 'Hexagon')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Regular Polygon (Hexagon/Triangle/Octagon)"
            >
              <span className="text-xs text-blue-600 font-mono font-extrabold group-hover:scale-110 transition-transform">⬡</span>
              <span className="text-[10px] leading-tight">Polygon</span>
            </button>

            <button
              onClick={() => handleCreateDefaultCutout('star', 38, 38, 0, 'Star Aperture')}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 p-2 rounded-lg text-slate-700 text-xs font-bold transition-all shadow-xs group cursor-pointer"
              title="Add Star cut aperture"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] leading-tight">Star Cut</span>
            </button>
          </div>
        </div>

        {/* List of Existing Cutouts */}
        {cutouts.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-blue-100 pb-3">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Configured Cutouts ({cutouts.length})
            </span>

            <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-0.5">
              {cutouts.map((cutout) => {
                const isSelected = cutout.id === activeCutoutId;
                const panelTargets = cutout.panelIds && cutout.panelIds.length > 0
                  ? cutout.panelIds.join(', ')
                  : cutout.panelId || 'top';

                return (
                  <div
                    key={cutout.id}
                    onClick={() => onSelectCutout(cutout.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    } ${!cutout.enabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {cutout.shapeType === 'circle' ? (
                          <Circle className="w-3.5 h-3.5 text-blue-600" />
                        ) : cutout.shapeType === 'slot' ? (
                          <div className="w-4 h-2 border border-blue-600 rounded-full" />
                        ) : cutout.shapeType === 'polygon' ? (
                          <span className="text-[11px] text-blue-600 font-extrabold font-mono">⬡</span>
                        ) : cutout.shapeType === 'star' ? (
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <div className={`w-3.5 h-2.5 border border-blue-600 ${cutout.cornerRadius > 0 ? 'rounded-xs' : ''}`} />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold truncate leading-tight">{cutout.name}</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded leading-tight ${
                            cutout.cutType === 'cut'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}>
                            {cutout.cutType === 'cut' ? 'Through Cut' : 'Vector Score'}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 leading-none mt-0.5 font-mono truncate">
                          {cutout.width}×{cutout.height}mm {cutout.cornerRadius > 0 ? `(r:${cutout.cornerRadius}mm)` : '(sharp)'} • <span className="text-blue-600 font-bold uppercase">{panelTargets}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateCutout({ ...cutout, enabled: !cutout.enabled });
                        }}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          cutout.enabled
                            ? 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                            : 'text-amber-500 hover:bg-amber-50'
                        }`}
                        title={cutout.enabled ? 'Disable cutout' : 'Enable cutout'}
                      >
                        {cutout.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateCutout(cutout.id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                        title="Duplicate cutout configuration"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCutout(cutout.id);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                        title="Delete cutout"
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

        {/* Selected Cutout Parameters Form */}
        {activeCutout ? (
          <div className="flex flex-col gap-4 mt-1 pt-2">
            {/* Cutout Title & Shape Visualizer Header */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                  Editing Cutout Configuration
                </span>
                <span className="text-[9px] font-mono text-slate-400">ID: {activeCutout.id.slice(-4)}</span>
              </div>

              {/* Name Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeCutout.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  placeholder="e.g. Screen Aperture, Vent Slot"
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Cut Type Selection: Laser Cut (Hole) vs Vector Score (Engrave Line) */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdate({ cutType: 'cut' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeCutout.cutType === 'cut'
                      ? 'bg-red-50 border-red-400 text-red-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Scissors className="w-3 h-3 text-red-500" />
                  <span className="text-[10px]">Through Cut (Hole)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdate({ cutType: 'engrave' })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeCutout.cutType === 'engrave'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3 h-3 text-blue-600" />
                  <span className="text-[10px]">Surface Score</span>
                </button>
              </div>
            </div>

            {/* Target Panels Multi-Select Grid */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500">Apply To Panel(s)</span>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tracking-wider uppercase">
                  Multi-Select
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {panels
                  .filter((p) => ['top', 'bottom', 'front', 'back', 'left', 'right'].includes(p.id))
                  .map((p) => {
                    const currentIds = activeCutout.panelIds || (activeCutout.panelId ? [activeCutout.panelId] : []);
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
                              if (!nextIds.includes(p.id)) nextIds.push(p.id);
                            } else {
                              nextIds = nextIds.filter((id) => id !== p.id);
                            }
                            handleUpdate({
                              panelIds: nextIds,
                              panelId: nextIds[0] || ''
                            });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] leading-tight capitalize truncate">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">
                            {p.width}×{p.height}mm
                          </span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Shape Geometry Type Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Shape Geometry</span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'rectangle', label: 'Rounded Rect', icon: '🔲' },
                  { id: 'slot', label: 'Capsule Slot', icon: '💊' },
                  { id: 'circle', label: 'Circle / Oval', icon: '⭕' },
                  { id: 'polygon', label: 'Polygon', icon: '⬡' },
                  { id: 'star', label: 'Star Cut', icon: '⭐' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleUpdate({ shapeType: st.id as ShapeCutoutType })}
                    className={`py-1.5 px-2 rounded-lg border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeCutout.shapeType === st.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs">{st.icon}</span>
                    <span className="text-[10px] leading-tight">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions: Width and Height */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Cutout Dimensions
                </span>
                <button
                  type="button"
                  onClick={() => setLockAspect(!lockAspect)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                    lockAspect
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                  title="Lock width and height to be equal (Square/Circle)"
                >
                  {lockAspect ? <Link className="w-3 h-3 text-blue-600" /> : <Unlink className="w-3 h-3" />}
                  <span>{lockAspect ? 'Locked (1:1)' : 'Free Size'}</span>
                </button>
              </div>

              {/* Width Slider and Number */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-600">Width (X)</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                    <input
                      type="number"
                      min="2"
                      max="400"
                      step="1"
                      value={activeCutout.width}
                      onChange={(e) => {
                        const val = Math.max(2, Math.min(400, Number(e.target.value) || 2));
                        if (lockAspect) {
                          handleUpdate({ width: val, height: val });
                        } else {
                          handleUpdate({ width: val });
                        }
                      }}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="250"
                  step="1"
                  value={activeCutout.width}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (lockAspect) {
                      handleUpdate({ width: val, height: val });
                    } else {
                      handleUpdate({ width: val });
                    }
                  }}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>

              {/* Height Slider and Number */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-600">Height (Y)</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                    <input
                      type="number"
                      min="2"
                      max="400"
                      step="1"
                      value={activeCutout.height}
                      onChange={(e) => {
                        const val = Math.max(2, Math.min(400, Number(e.target.value) || 2));
                        if (lockAspect) {
                          handleUpdate({ width: val, height: val });
                        } else {
                          handleUpdate({ height: val });
                        }
                      }}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="250"
                  step="1"
                  value={activeCutout.height}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (lockAspect) {
                      handleUpdate({ width: val, height: val });
                    } else {
                      handleUpdate({ height: val });
                    }
                  }}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>

              {/* Quick Size Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Presets:</span>
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleUpdate({ width: p.w, height: p.h, cornerRadius: Math.min(p.r, Math.min(p.w, p.h)/2) })}
                    className="text-[9px] font-mono font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-1.5 py-0.5 rounded border border-slate-200 transition-all cursor-pointer"
                  >
                    {p.label}mm
                  </button>
                ))}
              </div>
            </div>

            {/* CORNER RADIUS CONTROL (Primary User Feature) */}
            {(activeCutout.shapeType === 'rectangle' || activeCutout.shapeType === 'slot') && (
              <div className="bg-white p-3 rounded-lg border-2 border-blue-300 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">
                      Corner Fillet Radius
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <input
                      type="number"
                      min="0"
                      max={maxRadius}
                      step="0.5"
                      value={activeCutout.cornerRadius}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(maxRadius, Number(e.target.value) || 0));
                        handleUpdate({ cornerRadius: Number(val.toFixed(1)) });
                      }}
                      className="w-12 bg-transparent text-center text-xs font-mono font-extrabold text-blue-700 focus:outline-none"
                    />
                    <span className="text-[10px] text-blue-500 font-bold">mm</span>
                  </div>
                </div>

                {/* Corner Radius Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Sharp (0mm)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {activeCutout.cornerRadius === 0
                        ? 'Sharp 90° Corners'
                        : activeCutout.cornerRadius >= maxRadius - 0.1
                        ? `Full Round / Capsule (${activeCutout.cornerRadius}mm)`
                        : `Radius ${activeCutout.cornerRadius}mm (${Math.round((activeCutout.cornerRadius / Math.max(1, maxRadius)) * 100)}%)`}
                    </span>
                    <span>Max ({maxRadius.toFixed(1)}mm)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxRadius}
                    step="0.5"
                    value={activeCutout.cornerRadius}
                    onChange={(e) => handleUpdate({ cornerRadius: Number(Number(e.target.value).toFixed(1)) })}
                    className="w-full accent-blue-600 h-1.5 bg-blue-100 rounded cursor-pointer"
                  />
                </div>

                {/* Quick Radius Buttons */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdate({ cornerRadius: 0 })}
                    className={`py-1 rounded border text-center text-[9px] font-bold transition-all cursor-pointer ${
                      activeCutout.cornerRadius === 0
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Sharp (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ cornerRadius: Math.min(2, maxRadius) })}
                    className={`py-1 rounded border text-center text-[9px] font-bold transition-all cursor-pointer ${
                      activeCutout.cornerRadius === 2
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    2mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ cornerRadius: Math.min(5, maxRadius) })}
                    className={`py-1 rounded border text-center text-[9px] font-bold transition-all cursor-pointer ${
                      activeCutout.cornerRadius === 5
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    5mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ cornerRadius: Math.min(10, maxRadius) })}
                    className={`py-1 rounded border text-center text-[9px] font-bold transition-all cursor-pointer ${
                      activeCutout.cornerRadius === 10
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    10mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ cornerRadius: Number(maxRadius.toFixed(1)) })}
                    className={`py-1 rounded border text-center text-[9px] font-bold transition-all cursor-pointer ${
                      Math.abs(activeCutout.cornerRadius - maxRadius) < 0.2
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Full (Max)
                  </button>
                </div>
              </div>
            )}

            {/* Polygon / Star Specific Sliders */}
            {activeCutout.shapeType === 'polygon' && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-600">Polygon Sides</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{activeCutout.polygonSides || 6}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={activeCutout.polygonSides || 6}
                  onChange={(e) => handleUpdate({ polygonSides: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>
            )}

            {activeCutout.shapeType === 'star' && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-600">Star Points</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{activeCutout.starPoints || 5}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="1"
                  value={activeCutout.starPoints || 5}
                  onChange={(e) => handleUpdate({ starPoints: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />

                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-600">Inner Depth Ratio</span>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {Math.round((activeCutout.starInnerRatio || 0.45) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.05"
                  value={activeCutout.starInnerRatio || 0.45}
                  onChange={(e) => handleUpdate({ starInnerRatio: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>
            )}

            {/* Position and Rotation Controls */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Position & Alignment
              </span>

              {/* Offset X Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500">Offset X (mm)</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                    <input
                      type="number"
                      min="-200"
                      max="200"
                      step="1"
                      value={activeCutout.offsetX}
                      onChange={(e) => handleUpdate({ offsetX: Number(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold pr-1">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={activeCutout.offsetX}
                  onChange={(e) => handleUpdate({ offsetX: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>

              {/* Offset Y Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500">Offset Y (mm)</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                    <input
                      type="number"
                      min="-200"
                      max="200"
                      step="1"
                      value={activeCutout.offsetY}
                      onChange={(e) => handleUpdate({ offsetY: Number(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold pr-1">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={activeCutout.offsetY}
                  onChange={(e) => handleUpdate({ offsetY: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>

              {/* Rotation Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-500">Rotation Angle</span>
                  <div className="flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">
                    <input
                      type="number"
                      min="-360"
                      max="360"
                      step="1"
                      value={activeCutout.rotation}
                      onChange={(e) => handleUpdate({ rotation: Number(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-center text-xs font-mono font-bold text-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold pr-1">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={((activeCutout.rotation % 360) + 360) % 360}
                  onChange={(e) => handleUpdate({ rotation: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer"
                />
              </div>

              {/* Quick Center / Reset Alignments */}
              <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleUpdate({ offsetX: 0, offsetY: 0, rotation: 0 })}
                  className="py-1 px-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[9px] font-bold text-slate-700 hover:text-blue-600 text-center transition-all cursor-pointer"
                >
                  🎯 Center
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ offsetY: -30 })}
                  className="py-1 px-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[9px] font-bold text-slate-700 hover:text-blue-600 text-center transition-all cursor-pointer"
                >
                  ⬆️ Top
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ offsetY: 30 })}
                  className="py-1 px-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[9px] font-bold text-slate-700 hover:text-blue-600 text-center transition-all cursor-pointer"
                >
                  ⬇️ Bottom
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ rotation: (activeCutout.rotation + 90) % 360 })}
                  className="py-1 px-1 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 text-[9px] font-bold text-slate-700 hover:text-blue-600 text-center transition-all cursor-pointer flex items-center justify-center gap-0.5"
                >
                  <RotateCw className="w-2.5 h-2.5" /> +90°
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 bg-white/70 rounded-lg border border-slate-200/80 flex flex-col items-center gap-1.5">
            <Scissors className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">No Shape Cutout Selected</span>
            <span className="text-[10px] text-slate-500 max-w-xs leading-normal">
              Click a preset button above to create a rounded cutout, pill slot, or custom aperture with adjustable corner radius.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
