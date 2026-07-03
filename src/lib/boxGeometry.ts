/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point2D {
  x: number;
  y: number;
}

export type EdgeType = 'male' | 'female' | 'flat';

export interface BoxParams {
  width: number;       // Outer width (X) in mm
  height: number;      // Outer height (Y) in mm
  depth: number;       // Outer depth (Z) in mm
  thickness: number;   // Material wall thickness in mm
  fingerWidth: number; // Target finger/tab width in mm
  laserKerf: number;   // Kerf offset (extends tabs, shrinks slots) in mm
  boxType: 'closed' | 'open-top' | 'removable-lid';
  lidType?: 'friction' | 'sliding' | 'hinged' | 'drop-in';
  hasEnvelopeSlot?: boolean;
  envelopeSlotWidth?: number;
  envelopeSlotThickness?: number;
}

/**
 * Returns an odd number of segments along an edge length to match the target finger width
 */
export function calculateSegmentCount(length: number, targetFingerWidth: number): number {
  if (length <= 0 || targetFingerWidth <= 0) return 3;
  // We want an odd number of divisions: 1, 3, 5, 7, etc.
  const rawDivisions = length / targetFingerWidth;
  let divisions = Math.round(rawDivisions);
  if (divisions % 2 === 0) {
    // Round to nearest odd
    divisions = Math.abs(rawDivisions - (divisions - 1)) < Math.abs(rawDivisions - (divisions + 1))
      ? divisions - 1
      : divisions + 1;
  }
  return Math.max(3, divisions);
}

/**
 * Interface representing a 2D panel ready for flat nesting or SVG / DXF export
 */
export interface PanelData {
  id: string;
  name: string;
  width: number;
  height: number;
  points: Point2D[];
  holes?: Point2D[][];
  engravePaths?: Point2D[][];
}

/**
 * Generates the 2D polygon vertices of a rectangular panel including finger joints.
 * Local coordinate space: x in [0, A], y in [0, B]
 */
export function generatePanelPoints(
  A: number,
  B: number,
  t: number,
  Nu: number,
  Nv: number,
  edge0: EdgeType, // Bottom edge (y=0, u from 0 to A)
  edge1: EdgeType, // Right edge (x=A, v from 0 to B)
  edge2: EdgeType, // Top edge (y=B, u from A to 0)
  edge3: EdgeType, // Left edge (x=0, v from B to 0)
  kerf: number = 0 // Kerf compensation
): Point2D[] {
  const points: Point2D[] = [];

  // Helper to get offset for a segment
  // If male, even segments are tabs (outer, offset=0), odd are slots (inner, offset=t)
  // If female, even are slots (inner, offset=t), odd are tabs (outer, offset=0)
  const getOffset = (isMale: boolean, segmentIndex: number): number => {
    const isTab = isMale ? (segmentIndex % 2 === 0) : (segmentIndex % 2 !== 0);
    if (isTab) {
      // For tabs, we want to expand outwards by kerf/2
      return -kerf / 2;
    } else {
      // For slots, we want to narrow them (cut inwards further) by kerf/2
      return t + kerf / 2;
    }
  };

  // --- Edge 0 (Bottom): Tracing from local u=0 to A ---
  if (edge0 === 'flat') {
    points.push({ x: -kerf / 2, y: -kerf / 2 });
    points.push({ x: A + kerf / 2, y: -kerf / 2 });
  } else {
    const isMale = edge0 === 'male';
    for (let i = 0; i < Nu; i++) {
      const u1 = (i / Nu) * A;
      const u2 = ((i + 1) / Nu) * A;
      const vOffset = getOffset(isMale, i);
      const isTab = isMale ? (i % 2 === 0) : (i % 2 !== 0);
      const u1_adj = isTab ? (u1 - kerf / 2) : (u1 + kerf / 2);
      const u2_adj = isTab ? (u2 + kerf / 2) : (u2 - kerf / 2);
      points.push({ x: u1_adj, y: vOffset });
      points.push({ x: u2_adj, y: vOffset });
    }
  }

  // Corner transition 1 (Bottom to Right):
  const offsetEdge0End = edge0 === 'flat' ? 0 : getOffset(edge0 === 'male', Nu - 1);
  const offsetEdge1Start = edge1 === 'flat' ? 0 : getOffset(edge1 === 'male', 0);
  if (offsetEdge0End > 0 && offsetEdge1Start > 0) {
    // Both are slots (inner) -> insert the inside notch coordinate
    points.push({ x: A - offsetEdge1Start, y: offsetEdge0End });
  }

  // --- Edge 1 (Right): Tracing from local v=0 to B ---
  if (edge1 === 'flat') {
    points.push({ x: A + kerf / 2, y: -kerf / 2 });
    points.push({ x: A + kerf / 2, y: B + kerf / 2 });
  } else {
    const isMale = edge1 === 'male';
    for (let i = 0; i < Nv; i++) {
      const v1 = (i / Nv) * B;
      const v2 = ((i + 1) / Nv) * B;
      const uOffset = getOffset(isMale, i);
      const isTab = isMale ? (i % 2 === 0) : (i % 2 !== 0);
      const v1_adj = isTab ? (v1 - kerf / 2) : (v1 + kerf / 2);
      const v2_adj = isTab ? (v2 + kerf / 2) : (v2 - kerf / 2);
      points.push({ x: A - uOffset, y: v1_adj });
      points.push({ x: A - uOffset, y: v2_adj });
    }
  }

  // Corner transition 2 (Right to Top):
  const offsetEdge1End = edge1 === 'flat' ? 0 : getOffset(edge1 === 'male', Nv - 1);
  const offsetEdge2Start = edge2 === 'flat' ? 0 : getOffset(edge2 === 'male', Nu - 1);
  if (offsetEdge1End > 0 && offsetEdge2Start > 0) {
    points.push({ x: A - offsetEdge1End, y: B - offsetEdge2Start });
  }

  // --- Edge 2 (Top): Tracing from local u=A to 0 ---
  if (edge2 === 'flat') {
    points.push({ x: A + kerf / 2, y: B + kerf / 2 });
    points.push({ x: -kerf / 2, y: B + kerf / 2 });
  } else {
    const isMale = edge2 === 'male';
    for (let i = 0; i < Nu; i++) {
      const u1 = (1 - i / Nu) * A;
      const u2 = (1 - (i + 1) / Nu) * A;
      const absIndex = Nu - 1 - i;
      const vOffset = getOffset(isMale, absIndex);
      const isTab = isMale ? (absIndex % 2 === 0) : (absIndex % 2 !== 0);
      const u1_adj = isTab ? (u1 + kerf / 2) : (u1 - kerf / 2);
      const u2_adj = isTab ? (u2 - kerf / 2) : (u2 + kerf / 2);
      points.push({ x: u1_adj, y: B - vOffset });
      points.push({ x: u2_adj, y: B - vOffset });
    }
  }

  // Corner transition 3 (Top to Left):
  const offsetEdge2End = edge2 === 'flat' ? 0 : getOffset(edge2 === 'male', 0);
  const offsetEdge3Start = edge3 === 'flat' ? 0 : getOffset(edge3 === 'male', Nv - 1);
  if (offsetEdge2End > 0 && offsetEdge3Start > 0) {
    points.push({ x: offsetEdge3Start, y: B - offsetEdge2End });
  }

  // --- Edge 3 (Left): Tracing from local v=B to 0 ---
  if (edge3 === 'flat') {
    points.push({ x: -kerf / 2, y: B + kerf / 2 });
    points.push({ x: -kerf / 2, y: -kerf / 2 });
  } else {
    const isMale = edge3 === 'male';
    for (let i = 0; i < Nv; i++) {
      const v1 = (1 - i / Nv) * B;
      const v2 = (1 - (i + 1) / Nv) * B;
      const absIndex = Nv - 1 - i;
      const uOffset = getOffset(isMale, absIndex);
      const isTab = isMale ? (absIndex % 2 === 0) : (absIndex % 2 !== 0);
      const v1_adj = isTab ? (v1 + kerf / 2) : (v1 - kerf / 2);
      const v2_adj = isTab ? (v2 - kerf / 2) : (v2 + kerf / 2);
      points.push({ x: uOffset, y: v1_adj });
      points.push({ x: uOffset, y: v2_adj });
    }
  }

  // Corner transition 0 (Left to Bottom):
  const offsetEdge3End = edge3 === 'flat' ? 0 : getOffset(edge3 === 'male', 0);
  const offsetEdge0Start = edge0 === 'flat' ? 0 : getOffset(edge0 === 'male', 0);
  if (offsetEdge3End > 0 && offsetEdge0Start > 0) {
    points.push({ x: offsetEdge3End, y: offsetEdge0Start });
  }

  // Post-processing: remove duplicate sequential points
  const cleanPoints: Point2D[] = [];
  for (const p of points) {
    if (cleanPoints.length === 0) {
      cleanPoints.push(p);
    } else {
      const prev = cleanPoints[cleanPoints.length - 1];
      const distSq = (prev.x - p.x) ** 2 + (prev.y - p.y) ** 2;
      // Allow minor tolerance for precision
      if (distSq > 0.000001) {
        cleanPoints.push(p);
      }
    }
  }

  // Close loop by removing end point if it matches the start point
  if (cleanPoints.length > 1) {
    const first = cleanPoints[0];
    const last = cleanPoints[cleanPoints.length - 1];
    const distSq = (first.x - last.x) ** 2 + (first.y - last.y) ** 2;
    if (distSq < 0.000001) {
      cleanPoints.pop();
    }
  }

  return cleanPoints;
}

/**
 * Returns all generated panels based on the box parameters
 */
export function createCirclePoints(cx: number, cy: number, r: number, steps: number = 24): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    pts.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    });
  }
  return pts;
}

export function createRectHole(x1: number, y1: number, x2: number, y2: number): Point2D[] {
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 }
  ];
}

/**
 * Returns all generated panels based on the box parameters
 */
export function generateBoxPanels(params: BoxParams): PanelData[] {
  const { width: W, height: H, depth: D, thickness: t, fingerWidth: fw, laserKerf: kerf, boxType } = params;
  const lidType = params.lidType || 'friction';

  // Segment counts for each axis
  const Nu = calculateSegmentCount(W, fw); // Along Width
  const Nv = calculateSegmentCount(D, fw); // Along Depth
  const Nh = calculateSegmentCount(H, fw); // Along Height

  const panels: PanelData[] = [];

  // Setup holes storage for each face panel
  let leftHoles: Point2D[][] = [];
  let rightHoles: Point2D[][] = [];
  let backHoles: Point2D[][] = [];

  // Determine pocket/groove features under different lidTypes
  if (boxType === 'removable-lid') {
    if (lidType === 'sliding') {
      const slotW = D - 2 * t;
      const slotW_top = D - t;
      
      // Flush sliding lid groove:
      // The top of the top guide strip is exactly flush with the top of the side walls (H).
      // So the top guide strip lies from H - t to H, centered at H - t/2.
      const y_top_center = H - t / 2;
      
      // Bottom guide strip centered at H - 2.5 * t - 0.4 so there is exactly t + 0.4mm gap between strips.
      const y_bottom_center = H - 2.5 * t - 0.4;

      // Bottom strip slots on Left
      leftHoles.push(createRectHole(
        t + slotW * 0.2 + kerf/2,
        y_bottom_center - t/2 + kerf/2,
        t + slotW * 0.4 - kerf/2,
        y_bottom_center + t/2 - kerf/2
      ));
      leftHoles.push(createRectHole(
        t + slotW * 0.6 + kerf/2,
        y_bottom_center - t/2 + kerf/2,
        t + slotW * 0.8 - kerf/2,
        y_bottom_center + t/2 - kerf/2
      ));

      // Top strip slots on Left
      leftHoles.push(createRectHole(
        t + slotW_top * 0.2 + kerf/2,
        y_top_center - t/2 + kerf/2,
        t + slotW_top * 0.4 - kerf/2,
        y_top_center + t/2 - kerf/2
      ));
      leftHoles.push(createRectHole(
        t + slotW_top * 0.6 + kerf/2,
        y_top_center - t/2 + kerf/2,
        t + slotW_top * 0.8 - kerf/2,
        y_top_center + t/2 - kerf/2
      ));

      // Bottom strip slots on Right
      rightHoles.push(createRectHole(
        t + slotW * 0.2 + kerf/2,
        y_bottom_center - t/2 + kerf/2,
        t + slotW * 0.4 - kerf/2,
        y_bottom_center + t/2 - kerf/2
      ));
      rightHoles.push(createRectHole(
        t + slotW * 0.6 + kerf/2,
        y_bottom_center - t/2 + kerf/2,
        t + slotW * 0.8 - kerf/2,
        y_bottom_center + t/2 - kerf/2
      ));

      // Top strip slots on Right
      rightHoles.push(createRectHole(
        t + slotW_top * 0.2 + kerf/2,
        y_top_center - t/2 + kerf/2,
        t + slotW_top * 0.4 - kerf/2,
        y_top_center + t/2 - kerf/2
      ));
      rightHoles.push(createRectHole(
        t + slotW_top * 0.6 + kerf/2,
        y_top_center - t/2 + kerf/2,
        t + slotW_top * 0.8 - kerf/2,
        y_top_center + t/2 - kerf/2
      ));

      // Add top strip slots on Back panel for Back top guide strip
      const slotW_back_short = Math.max(20, W - 2 * t - 30);
      if (slotW_back_short > 20) {
        backHoles.push(createRectHole(
          t + 15 + slotW_back_short * 0.2 + kerf/2,
          y_top_center - t/2 + kerf/2,
          t + 15 + slotW_back_short * 0.4 - kerf/2,
          y_top_center + t/2 - kerf/2
        ));
        backHoles.push(createRectHole(
          t + 15 + slotW_back_short * 0.6 + kerf/2,
          y_top_center - t/2 + kerf/2,
          t + 15 + slotW_back_short * 0.8 - kerf/2,
          y_top_center + t/2 - kerf/2
        ));
      }
    } else if (lidType === 'hinged') {
      // Left & Right panels have circular socket pivot holes (near top-back corner)
      // Left panel pivot is near back (x = t + 10)
      // Right panel pivot is near back (x = D - t - 10)
      // Radius of the hole is t + 0.3 to perfectly fit the t radius peg with 0.3mm clearance
      // Sits higher, 6mm below the top of the box
      leftHoles.push(createCirclePoints(t + 10, H - 6, t + 0.3));
      rightHoles.push(createCirclePoints(D - t - 10, H - 6, t + 0.3));
    }
  }

  // 1. Bottom Panel (W x D)
  // Edges: 0:Front(W), 1:Right(D), 2:Back(W), 3:Left(D)
  // Standard: All Male
  const bottomPoints = generatePanelPoints(W, D, t, Nu, Nv, 'male', 'male', 'male', 'male', kerf);
  panels.push({ id: 'bottom', name: 'Bottom Panel', width: W, height: D, points: bottomPoints });

  // 2. Top Panel (W x D)
  // If open-top: no panel
  if (boxType !== 'open-top') {
    let topPoints: Point2D[] = [];
    let topHoles: Point2D[][] = [];
    let name = 'Top Panel';
    let pWidth = W;
    let pHeight = D;

    if (boxType === 'removable-lid') {
      name = 'Removable Lid';
      if (lidType === 'friction') {
        topPoints = generatePanelPoints(W, D, t, Nu, Nv, 'male', 'male', 'male', 'male', kerf);
        if (params.hasEnvelopeSlot) {
          const sWidth = Math.min(params.envelopeSlotWidth ?? 140, W - 20);
          const sThickness = Math.min(params.envelopeSlotThickness ?? 6, D - 20);
          topHoles.push(createRectHole(W / 2 - sWidth / 2, D / 2 - sThickness / 2, W / 2 + sWidth / 2, D / 2 + sThickness / 2));
        } else {
          // Clean finger pull-hole centered on the lid
          topHoles.push(createCirclePoints(W / 2, D / 2, Math.max(10, Math.min(W, D) * 0.12)));
        }
      } else if (lidType === 'sliding') {
        const lipDepth = 15; // 15mm protrusion
        pWidth = W - 2 * t - 0.7; // fits inside track of Left/Right guide plates
        pHeight = D - t + lipDepth;
        
        // Beautiful 15mm ergonomic front pull lip/tab instead of circle cutout
        const lipWidth = Math.min(40, pWidth - 20);
        const lipStart = (pWidth - lipWidth) / 2;
        const lipEnd = lipStart + lipWidth;

        topPoints = [];
        topPoints.push({ x: -kerf/2, y: lipDepth - kerf/2 });
        topPoints.push({ x: lipStart, y: lipDepth - kerf/2 });
        topPoints.push({ x: lipStart + 3, y: -kerf/2 });
        topPoints.push({ x: lipEnd - 3, y: -kerf/2 });
        topPoints.push({ x: lipEnd, y: lipDepth - kerf/2 });
        topPoints.push({ x: pWidth + kerf/2, y: lipDepth - kerf/2 });
        topPoints.push({ x: pWidth + kerf/2, y: pHeight + kerf/2 });
        topPoints.push({ x: -kerf/2, y: pHeight + kerf/2 });

        if (params.hasEnvelopeSlot) {
          const sWidth = Math.min(params.envelopeSlotWidth ?? 140, pWidth - 20);
          const sThickness = Math.min(params.envelopeSlotThickness ?? 6, pHeight - 40);
          topHoles.push(createRectHole(
            pWidth / 2 - sWidth / 2, 
            lipDepth + (pHeight - lipDepth) / 2 - sThickness / 2, 
            pWidth / 2 + sWidth / 2, 
            lipDepth + (pHeight - lipDepth) / 2 + sThickness / 2
          ));
        }
      } else if (lidType === 'hinged') {
        const W_lid = W - 2 * t - 1.0;
        const D_lid = D - 2 * t - 1.0; // Fits inside all 4 walls with 0.5mm clearance on all sides
        const lipDepth = 17; // 17mm protrusion
        pWidth = W_lid + 2 * t; // Adjust width to include the pegs protruding on both sides
        pHeight = D_lid + lipDepth;

        const y_pivot = D_lid - 9.5;
        const steps = 8;

        topPoints = [];
        // Shift all points in X by +t to keep them in positive range [0, pWidth]
        topPoints.push({ x: t, y: lipDepth });
        
        // Beautiful 17mm ergonomic front pull lip/tab
        const lipWidth = Math.min(40, W_lid - 20);
        const lipStart = (W_lid - lipWidth) / 2;
        const lipEnd = lipStart + lipWidth;

        topPoints.push({ x: t + lipStart, y: lipDepth });
        topPoints.push({ x: t + lipStart + 3, y: 0 });
        topPoints.push({ x: t + lipEnd - 3, y: 0 });
        topPoints.push({ x: t + lipEnd, y: lipDepth });

        topPoints.push({ x: t + W_lid, y: lipDepth });
        topPoints.push({ x: t + W_lid, y: lipDepth + y_pivot - t });
        
        // Semicircular peg on the right: centered at (t + W_lid, y_pivot), radius t, protruding to the right
        for (let i = 0; i <= steps; i++) {
          const angle = -Math.PI / 2 + (i / steps) * Math.PI;
          topPoints.push({
            x: t + W_lid + Math.cos(angle) * t,
            y: lipDepth + y_pivot + Math.sin(angle) * t
          });
        }

        topPoints.push({ x: t + W_lid, y: lipDepth + D_lid });
        topPoints.push({ x: t, y: lipDepth + D_lid });
        topPoints.push({ x: t, y: lipDepth + y_pivot + t });

        // Semicircular peg on the left: centered at (t, y_pivot), radius t, protruding to the left
        for (let i = 0; i <= steps; i++) {
          const angle = Math.PI / 2 + (i / steps) * Math.PI;
          topPoints.push({
            x: t + Math.cos(angle) * t,
            y: lipDepth + y_pivot + Math.sin(angle) * t
          });
        }
        if (params.hasEnvelopeSlot) {
          const sWidth = Math.min(params.envelopeSlotWidth ?? 140, W_lid - 20);
          const sThickness = Math.min(params.envelopeSlotThickness ?? 6, D_lid - 20);
          topHoles.push(createRectHole(
            t + W_lid / 2 - sWidth / 2, 
            lipDepth + D_lid / 2 - sThickness / 2, 
            t + W_lid / 2 + sWidth / 2, 
            lipDepth + D_lid / 2 + sThickness / 2
          ));
        }
      } else if (lidType === 'drop-in') {
        topPoints = generatePanelPoints(W, D, t, Nu, Nv, 'flat', 'flat', 'flat', 'flat', kerf);
        if (params.hasEnvelopeSlot) {
          const sWidth = Math.min(params.envelopeSlotWidth ?? 140, W - 20);
          const sThickness = Math.min(params.envelopeSlotThickness ?? 6, D - 30);
          topHoles.push(createRectHole(W / 2 - sWidth / 2, D / 2 - sThickness / 2, W / 2 + sWidth / 2, D / 2 + sThickness / 2));
          // Move mortise slots outward to make space for the center envelope slot
          const mortiseXOffset = Math.max(15, sWidth / 2 + 15);
          topHoles.push(createRectHole(W / 2 - mortiseXOffset - t / 2, D / 2 - 5, W / 2 - mortiseXOffset + t / 2, D / 2 + 5));
          topHoles.push(createRectHole(W / 2 + mortiseXOffset - t / 2, D / 2 - 5, W / 2 + mortiseXOffset + t / 2, D / 2 + 5));
        } else {
          // Handle standard mortise slots inside center of drop lid
          topHoles.push(createRectHole(W/2 - 15 - t/2, D/2 - 5, W/2 - 15 + t/2, D/2 + 5));
          topHoles.push(createRectHole(W/2 + 15 - t/2, D/2 - 5, W/2 + 15 + t/2, D/2 + 5));
        }
      }
    } else {
      topPoints = generatePanelPoints(W, D, t, Nu, Nv, 'male', 'male', 'male', 'male', kerf);
      if (params.hasEnvelopeSlot) {
        const sWidth = Math.min(params.envelopeSlotWidth ?? 140, W - 20);
        const sThickness = Math.min(params.envelopeSlotThickness ?? 6, D - 20);
        topHoles.push(createRectHole(W / 2 - sWidth / 2, D / 2 - sThickness / 2, W / 2 + sWidth / 2, D / 2 + sThickness / 2));
      }
    }

    panels.push({
      id: 'top',
      name,
      width: pWidth,
      height: pHeight,
      points: topPoints,
      holes: topHoles.length > 0 ? topHoles : undefined
    });
  }

  // 3. Front Panel (W x H)
  let fHeight = H;
  let topEdgeTypeFront: EdgeType = boxType === 'open-top' ? 'flat' : 'female';
  if (boxType === 'removable-lid') {
    if (lidType === 'sliding') {
      // Shorter flat top edge to allow lid to slide forward over the front
      // The bottom guide strip top surface is at H - 2*t - 0.4.
      // So front panel height should be exactly H - 2*t - 0.4 to be flush with the track.
      fHeight = H - 2 * t - 0.4;
      topEdgeTypeFront = 'flat';
    } else if (lidType === 'hinged') {
      // Goes up to the full height H, but with a custom aesthetically pleasing recess/notch
      fHeight = H;
      topEdgeTypeFront = 'flat';
    } else if (lidType === 'drop-in') {
      topEdgeTypeFront = 'flat';
    }
  }
  let frontPoints = generatePanelPoints(W, fHeight, t, Nu, Nh, 'female', 'male', topEdgeTypeFront, 'male', kerf);

  if (boxType === 'removable-lid' && lidType === 'sliding') {
    // To ensure the finger joints on the left and right edges perfectly align with the side panels (which have height H),
    // we generate the panel at full height H, and then flat-cut/clip it at y = fHeight using a robust polygon clipping algorithm.
    const fullFrontPoints = generatePanelPoints(W, H, t, Nu, Nh, 'female', 'male', 'flat', 'male', kerf);
    const clippedPoints: Point2D[] = [];
    
    for (let i = 0; i < fullFrontPoints.length; i++) {
      const p1 = fullFrontPoints[i];
      const p2 = fullFrontPoints[(i + 1) % fullFrontPoints.length];
      
      if (p1.y <= fHeight) {
        clippedPoints.push(p1);
      }
      
      // Check for crossing fHeight
      if ((p1.y <= fHeight && p2.y > fHeight) || (p1.y > fHeight && p2.y <= fHeight)) {
        let intersectX = p1.x;
        if (Math.abs(p2.y - p1.y) > 0.00001) {
          intersectX = p1.x + (p2.x - p1.x) * (fHeight - p1.y) / (p2.y - p1.y);
        }
        clippedPoints.push({ x: intersectX, y: fHeight });
      }
    }
    
    if (clippedPoints.length > 2) {
      frontPoints = clippedPoints;
    }
  }

  if (boxType === 'removable-lid' && lidType === 'hinged') {
    // Modify the top edge of the front panel to add the notch so the 17mm lid lip sits within the box perfectly
    const W_lid = W - 2 * t - 1.0;
    const lipWidth = Math.min(40, W_lid - 20);
    const notchWidth = lipWidth + 6; // 3mm clearance on each side
    const notchStart = (W - notchWidth) / 2;
    const notchEnd = notchStart + notchWidth;
    const notchDepth = 12.5 + t / 2; // 12.5mm + t/2 depth for comfortable clearance under the 17mm lip

    const newPoints: Point2D[] = [];
    let modified = false;
    for (let i = 0; i < frontPoints.length; i++) {
      const p = frontPoints[i];
      const next = frontPoints[(i + 1) % frontPoints.length];
      
      newPoints.push(p);

      // Check if this segment represents the flat top edge going from x ≈ W to x ≈ 0 at y ≈ H
      if (!modified && p.y > fHeight - 5 && next.y > fHeight - 5 && p.x > W - 5 && next.x < 5) {
        const currentY = p.y;
        const notchBottomY = currentY - notchDepth;
        newPoints.push({ x: notchEnd, y: currentY });
        newPoints.push({ x: notchEnd, y: notchBottomY });
        newPoints.push({ x: notchStart, y: notchBottomY });
        newPoints.push({ x: notchStart, y: currentY });
        modified = true;
      }
    }
    if (modified) {
      frontPoints = newPoints;
    }
  }

  panels.push({ id: 'front', name: 'Front Panel', width: W, height: fHeight, points: frontPoints });

  // 4. Back Panel (W x H)
  let topEdgeTypeBack: EdgeType = boxType === 'open-top' ? 'flat' : 'female';
  if (boxType === 'removable-lid' && (lidType === 'sliding' || lidType === 'hinged' || lidType === 'drop-in')) {
    topEdgeTypeBack = 'flat';
  }
  const backPoints = generatePanelPoints(W, H, t, Nu, Nh, 'female', 'male', topEdgeTypeBack, 'male', kerf);
  panels.push({
    id: 'back',
    name: 'Back Panel',
    width: W,
    height: H,
    points: backPoints,
    holes: backHoles.length > 0 ? backHoles : undefined
  });

  // 5. Left Panel (D x H)
  let topEdgeTypeLeft: EdgeType = boxType === 'open-top' ? 'flat' : 'female';
  if (boxType === 'removable-lid' && (lidType === 'sliding' || lidType === 'hinged' || lidType === 'drop-in')) {
    topEdgeTypeLeft = 'flat';
  }
  const leftPoints = generatePanelPoints(D, H, t, Nv, Nh, 'female', 'female', topEdgeTypeLeft, 'female', kerf);
  panels.push({
    id: 'left',
    name: 'Left Panel',
    width: D,
    height: H,
    points: leftPoints,
    holes: leftHoles.length > 0 ? leftHoles : undefined
  });

  // 6. Right Panel (D x H)
  let topEdgeTypeRight: EdgeType = boxType === 'open-top' ? 'flat' : 'female';
  if (boxType === 'removable-lid' && (lidType === 'sliding' || lidType === 'hinged' || lidType === 'drop-in')) {
    topEdgeTypeRight = 'flat';
  }
  const rightPoints = generatePanelPoints(D, H, t, Nv, Nh, 'female', 'female', topEdgeTypeRight, 'female', kerf);
  panels.push({
    id: 'right',
    name: 'Right Panel',
    width: D,
    height: H,
    points: rightPoints,
    holes: rightHoles.length > 0 ? rightHoles : undefined
  });

  // 7. Extra Panel: Interlocking Handle Key (Only under drop-in lid style)
  if (boxType === 'removable-lid' && lidType === 'drop-in') {
    const sWidth = params.hasEnvelopeSlot ? Math.min(params.envelopeSlotWidth ?? 140, W - 20) : 0;
    const mortiseXOffset = params.hasEnvelopeSlot ? Math.max(15, sWidth / 2 + 15) : 15;
    
    const hw = 2 * mortiseXOffset + 30;
    const hh = 25;
    const tLeft = 15;
    const tRight = 2 * mortiseXOffset + 15;

    const hPoints: Point2D[] = [
      { x: 0, y: 0 },
      // Tab 1 (left)
      { x: tLeft - t/2, y: 0 },
      { x: tLeft - t/2, y: -t },
      { x: tLeft + t/2, y: -t },
      { x: tLeft + t/2, y: 0 },
      // Tab 2 (right)
      { x: tRight - t/2, y: 0 },
      { x: tRight - t/2, y: -t },
      { x: tRight + t/2, y: -t },
      { x: tRight + t/2, y: 0 },
      
      { x: hw, y: 0 },
      { x: hw, y: 15 },
      { x: hw - 6, y: hh },
      { x: 6, y: hh },
      { x: 0, y: 15 }
    ];
    const hHoles: Point2D[][] = [
      createRectHole(tLeft, 6, tRight, 16)
    ];

    panels.push({
      id: 'lid_handle',
      name: 'Lid Handle Key',
      width: hw,
      height: hh,
      points: hPoints,
      holes: hHoles
    });
  }

  // 8. Extra Panels: Slider Inner Guide Strips (For removable-lid and sliding style)
  if (boxType === 'removable-lid' && lidType === 'sliding') {
    const slotW = D - 2 * t;
    const stripW = 15; // width of the guide strip (depth of the ledge)

    // Generate points for a horizontal guide strip with 2 outer tabs (which insert into the side panels)
    // The outer edge is along y = t + kerf/2. The tabs extend into positive y (from t + kerf/2 down to 0).
    const generateGuideStripPoints = (L: number, W_strip: number, t: number, kerf: number): Point2D[] => {
      const yShift = t + kerf / 2;
      return [
        { x: 0, y: yShift },
        // Tab 1: wider by kerf/2 on both sides, longer by kerf/2
        { x: L * 0.2 - kerf/2, y: yShift },
        { x: L * 0.2 - kerf/2, y: 0 },
        { x: L * 0.4 + kerf/2, y: 0 },
        { x: L * 0.4 + kerf/2, y: yShift },
        // Tab 2
        { x: L * 0.6 - kerf/2, y: yShift },
        { x: L * 0.6 - kerf/2, y: 0 },
        { x: L * 0.8 + kerf/2, y: 0 },
        { x: L * 0.8 + kerf/2, y: yShift },
        
        { x: L, y: yShift },
        { x: L, y: W_strip + yShift },
        { x: 0, y: W_strip + yShift }
      ];
    };

    const stripHeight = stripW + t + kerf / 2;
    const stripPoints = generateGuideStripPoints(slotW, stripW, t, kerf);

    panels.push({
      id: 'left_bottom_guide',
      name: 'Left Bottom Guide Strip',
      width: slotW,
      height: stripHeight,
      points: stripPoints
    });

    panels.push({
      id: 'right_bottom_guide',
      name: 'Right Bottom Guide Strip',
      width: slotW,
      height: stripHeight,
      points: stripPoints
    });

    // 8b. Unified U-shaped Top Railing Frame (All one piece!)
    const W_frame = W - 2 * t;
    const D_frame = D - t; // D - t to extend all the way to the front
    const slotW_back_short = Math.max(20, W - 2 * t - 30);

    const tb1_start = 15 + slotW_back_short * 0.2;
    const tb1_end = 15 + slotW_back_short * 0.4;
    const tb2_start = 15 + slotW_back_short * 0.6;
    const tb2_end = 15 + slotW_back_short * 0.8;

    const framePoints: Point2D[] = [
      // 1. Left outer edge with outward-pointing tabs (going from front to back, x = 0, y = 0 to D_frame)
      { x: t, y: 0 },
      { x: t, y: t + D_frame * 0.2 - kerf/2 },
      { x: -kerf/2, y: t + D_frame * 0.2 - kerf/2 },
      { x: -kerf/2, y: t + D_frame * 0.4 + kerf/2 },
      { x: t, y: t + D_frame * 0.4 + kerf/2 },
      { x: t, y: t + D_frame * 0.6 - kerf/2 },
      { x: -kerf/2, y: t + D_frame * 0.6 - kerf/2 },
      { x: -kerf/2, y: t + D_frame * 0.8 + kerf/2 },
      { x: t, y: t + D_frame * 0.8 + kerf/2 },
      { x: t, y: D_frame },

      // 2. Back outer edge with outward-pointing tabs (going from left to right, y = D_frame, x = 0 to W_frame)
      { x: t + tb1_start - kerf/2, y: D_frame },
      { x: t + tb1_start - kerf/2, y: D_frame + t + kerf/2 },
      { x: t + tb1_end + kerf/2, y: D_frame + t + kerf/2 },
      { x: t + tb1_end + kerf/2, y: D_frame },
      { x: t + tb2_start - kerf/2, y: D_frame },
      { x: t + tb2_start - kerf/2, y: D_frame + t + kerf/2 },
      { x: t + tb2_end + kerf/2, y: D_frame + t + kerf/2 },
      { x: t + tb2_end + kerf/2, y: D_frame },
      { x: t + W_frame, y: D_frame },

      // 3. Right outer edge with outward-pointing tabs (going from back to front, x = W_frame, y = D_frame down to 0)
      { x: t + W_frame, y: t + D_frame * 0.8 + kerf/2 },
      { x: t + W_frame + t + kerf/2, y: t + D_frame * 0.8 + kerf/2 },
      { x: t + W_frame + t + kerf/2, y: t + D_frame * 0.6 - kerf/2 },
      { x: t + W_frame, y: t + D_frame * 0.6 - kerf/2 },
      { x: t + W_frame, y: t + D_frame * 0.4 + kerf/2 },
      { x: t + W_frame + t + kerf/2, y: t + D_frame * 0.4 + kerf/2 },
      { x: t + W_frame + t + kerf/2, y: t + D_frame * 0.2 - kerf/2 },
      { x: t + W_frame, y: t + D_frame * 0.2 - kerf/2 },
      { x: t + W_frame, y: 0 },

      // 4. Front right end
      { x: t + W_frame - stripW, y: 0 },

      // 5. Inner right edge (going from front to back, x = W_frame - stripW, y = 0 to D_frame - stripW)
      { x: t + W_frame - stripW, y: D_frame - stripW },

      // 6. Inner back edge (going from right to left, y = D_frame - stripW, x = W_frame - stripW to stripW)
      { x: t + stripW, y: D_frame - stripW },

      // 7. Inner left edge (going from back to front, x = stripW, y = D_frame - stripW to 0)
      { x: t + stripW, y: 0 }
    ];

    panels.push({
      id: 'top_rail_frame',
      name: 'Unified Top Railing Frame (Flush Top Lip)',
      width: W,
      height: D,
      points: framePoints
    });
  }

  return panels;
}

/**
 * Packs 6 panels flat into coordinates for the nesting layout sheet
 */
export interface PlacedPanel {
  panel: PanelData;
  x: number;
  y: number;
  rotate: boolean;
  sheetIndex: number;
}

export interface NestingLayout {
  sheetWidth: number;
  sheetHeight: number;
  sheetsCount: number;
  placedPanels: PlacedPanel[];
}

export function getRotatedPointsAndHoles(panel: PanelData, rotate: boolean) {
  const pw = panel.width;
  const ph = panel.height;
  if (!rotate) {
    return {
      points: panel.points.map((pt) => ({ x: pt.x, y: ph - pt.y })),
      holes: panel.holes?.map((hole) => hole.map((pt) => ({ x: pt.x, y: ph - pt.y }))) || [],
      engravePaths: panel.engravePaths || []
    };
  }
  return {
    points: panel.points.map((pt) => ({ x: pt.y, y: pt.x })),
    holes: panel.holes?.map((hole) => hole.map((pt) => ({ x: pt.y, y: pt.x }))) || [],
    engravePaths: panel.engravePaths?.map((path) => path.map((pt) => ({ x: ph - pt.y, y: pt.x }))) || []
  };
}

export function computeNesting(
  panels: PanelData[],
  spacing: number = 10,
  customSheetWidth?: number,
  customSheetHeight?: number
): NestingLayout {
  const sheetWidth = customSheetWidth || 800;
  const sheetHeight = customSheetHeight || 500;

  interface ActiveSheet {
    currentX: number;
    currentY: number;
    rowHeight: number;
  }

  const sheets: ActiveSheet[] = [];
  const placedPanels: PlacedPanel[] = [];

  for (const panel of panels) {
    let pw = panel.width;
    let ph = panel.height;

    // Check if rotating 90 deg fits strictly better when standard dimensions are too wide/tall,
    // or if the standard dimensions don't fit but the rotated ones do.
    let rotate = false;
    const standardFitsW = pw + spacing * 2 <= sheetWidth;
    const standardFitsH = ph + spacing * 2 <= sheetHeight;
    const rotatedFitsW = ph + spacing * 2 <= sheetWidth;
    const rotatedFitsH = pw + spacing * 2 <= sheetHeight;

    if (!standardFitsW && rotatedFitsW && rotatedFitsH) {
      rotate = true;
      pw = panel.height;
      ph = panel.width;
    }

    let placed = false;
    // Iterate existing sheets to find the first sheet that has enough room
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const s = sheets[sIdx];
      
      // Can it fit on current row?
      if (s.currentX + pw + spacing <= sheetWidth && s.currentY + ph + spacing <= sheetHeight) {
        placedPanels.push({
          panel,
          x: s.currentX,
          y: s.currentY,
          rotate,
          sheetIndex: sIdx
        });
        s.rowHeight = Math.max(s.rowHeight, ph);
        s.currentX += pw + spacing;
        placed = true;
        break;
      }
      
      // Can we start a new row on this sheet?
      if (spacing + pw + spacing <= sheetWidth && s.currentY + s.rowHeight + spacing + ph + spacing <= sheetHeight) {
        s.currentY += s.rowHeight + spacing;
        s.currentX = spacing;
        s.rowHeight = ph;

        placedPanels.push({
          panel,
          x: s.currentX,
          y: s.currentY,
          rotate,
          sheetIndex: sIdx
        });
        s.currentX += pw + spacing;
        placed = true;
        break;
      }
    }

    // Place on a brand new sheet if it doesn't fit on any existing sheet
    if (!placed) {
      const newSheetIndex = sheets.length;
      sheets.push({
        currentX: spacing + pw + spacing,
        currentY: spacing,
        rowHeight: ph
      });
      placedPanels.push({
        panel,
        x: spacing,
        y: spacing,
        rotate,
        sheetIndex: newSheetIndex
      });
    }
  }

  const sheetsCount = Math.max(1, sheets.length);

  return {
    sheetWidth,
    sheetHeight,
    sheetsCount,
    placedPanels
  };
}

/**
 * Generates an SVG string containing all cut paths with support for inner holes
 */
export function exportToSVG(
  panels: PanelData[],
  params: BoxParams,
  nestingSpacing: number = 10,
  customSheetWidth?: number,
  customSheetHeight?: number
): string {
  const nesting = computeNesting(panels, nestingSpacing, customSheetWidth, customSheetHeight);
  const { sheetWidth, sheetHeight, sheetsCount, placedPanels } = nesting;
  const verticalGap = 20; // 20mm gap between physical stacked cutout boards
  const totalSvgHeight = sheetsCount * sheetHeight + (sheetsCount - 1) * verticalGap;
  const SCALE = 1.0; // Pure Millimeters (1 unit = 1 mm) to guarantee perfect physical scale consistency across DXF and SVG formats

  let svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${(sheetWidth * SCALE).toFixed(3)} ${(totalSvgHeight * SCALE).toFixed(3)}" width="${sheetWidth}mm" height="${totalSvgHeight}mm">
  <style>
    .cut-path { fill: none; stroke: #ff0000; stroke-width: 0.15; stroke-linecap: round; stroke-linejoin: round; }
    .engrave { fill: none; stroke: #0000ff; stroke-width: 0.25; }
    .label { font-family: 'Courier New', monospace; font-size: ${(4 * SCALE).toFixed(3)}px; fill: #0000ff; font-weight: bold; }
    .sheet-boundary { fill: none; stroke: #94a3b8; stroke-width: ${(0.15 * SCALE).toFixed(3)}; stroke-dasharray: ${(1.5 * SCALE).toFixed(1)},${(1.5 * SCALE).toFixed(1)}; }
    .sheet-label { font-family: 'Courier New', monospace; font-size: ${(5 * SCALE).toFixed(3)}px; fill: #94a3b8; font-weight: bold; }
  </style>
`;

  // Draw placed panels
  for (const placed of placedPanels) {
    const { panel, x, y, rotate, sheetIndex } = placed;
    const { points, holes, engravePaths } = getRotatedPointsAndHoles(panel, rotate);
    
    // Vertical offset for pagination
    const finalY = y + sheetIndex * (sheetHeight + verticalGap);
    let pathD = '';
    
    // Draw outer profile
    points.forEach((pt, idx) => {
      pathD += `${idx === 0 ? 'M' : 'L'} ${((x + pt.x) * SCALE).toFixed(3)} ${((finalY + pt.y) * SCALE).toFixed(3)} `;
    });
    pathD += 'Z ';

    // Draw inner holes/cutouts
    if (holes && holes.length > 0) {
      holes.forEach((hole) => {
        hole.forEach((pt, idx) => {
          pathD += `${idx === 0 ? 'M' : 'L'} ${((x + pt.x) * SCALE).toFixed(3)} ${((finalY + pt.y) * SCALE).toFixed(3)} `;
        });
        pathD += 'Z ';
      });
    }

    // Draw engrave paths
    let engraveD = '';
    if (engravePaths && engravePaths.length > 0) {
      engravePaths.forEach((path) => {
        if (path.length === 0) return;
        path.forEach((pt, idx) => {
          engraveD += `${idx === 0 ? 'M' : 'L'} ${((x + pt.x) * SCALE).toFixed(3)} ${((finalY + pt.y) * SCALE).toFixed(3)} `;
        });
        const first = path[0];
        const last = path[path.length - 1];
        if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 0.1) {
          engraveD += 'Z ';
        }
      });
    }

    svg += `  <!-- ${panel.name} on Sheet ${sheetIndex + 1} -->\n`;
    svg += `  <path d="${pathD.trim()}" class="cut-path" fill-rule="evenodd" id="cut_${panel.id}" />\n`;
    if (engraveD) {
      svg += `  <path d="${engraveD.trim()}" class="engrave" id="engrave_${panel.id}" />\n`;
    }
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Generates a clean DXF string containing line loops of the flat panels and internal holes
 */
export function exportToDXF(
  panels: PanelData[],
  nestingSpacing: number = 10,
  customSheetWidth?: number,
  customSheetHeight?: number
): string {
  const nesting = computeNesting(panels, nestingSpacing, customSheetWidth, customSheetHeight);
  const { sheetWidth, sheetHeight, sheetsCount, placedPanels } = nesting;
  const verticalGap = 20;

  let dxf = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1006
  0
ENDSEC
  0
SECTION
  2
ENTITIES
`;

  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string = '0') => {
    return `  0
LINE
  8
${layer}
 10
${x1.toFixed(4)}
 20
${y1.toFixed(4)}
 30
0.0
 11
${x2.toFixed(4)}
 21
${y2.toFixed(4)}
 31
0.0
`;
  };

  const addText = (text: string, x: number, y: number, height: number = 5, layer: string = 'TEXT_LABELS') => {
    return `  0
TEXT
  8
${layer}
 10
${x.toFixed(4)}
 20
${y.toFixed(4)}
 30
0.0
 40
${height.toFixed(1)}
   1
${text}
`;
  };

  // Draw placed panels
  for (const placed of placedPanels) {
    const { panel, x: px, y: py, rotate, sheetIndex } = placed;
    const { points: pts, holes, engravePaths } = getRotatedPointsAndHoles(panel, rotate);
    if (pts.length < 2) continue;

    const finalPy = py + sheetIndex * (sheetHeight + verticalGap);

    // DXF outer boundaries
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      dxf += addLine(px + p1.x, -(finalPy + p1.y), px + p2.x, -(finalPy + p2.y), 'CUT_PATH');
    }

    // DXF inner holes lines
    if (holes && holes.length > 0) {
      for (const hole of holes) {
        if (hole.length < 2) continue;
        for (let i = 0; i < hole.length; i++) {
          const p1 = hole[i];
          const p2 = hole[(i + 1) % hole.length];
          dxf += addLine(px + p1.x, -(finalPy + p1.y), px + p2.x, -(finalPy + p2.y), 'CUT_PATH');
        }
      }
    }

    // DXF engrave lines
    if (engravePaths && engravePaths.length > 0) {
      for (const path of engravePaths) {
        if (path.length < 2) continue;
        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          dxf += addLine(px + p1.x, -(finalPy + p1.y), px + p2.x, -(finalPy + p2.y), 'ENGRAVE');
        }
        const first = path[0];
        const last = path[path.length - 1];
        if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 0.1) {
          dxf += addLine(px + last.x, -(finalPy + last.y), px + first.x, -(finalPy + first.y), 'ENGRAVE');
        }
      }
    }
  }

  dxf += `  0
ENDSEC
  0
EOF
`;

  return dxf;
}
