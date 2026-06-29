/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D } from './boxGeometry';

export type Point = Point2D;

interface Segment {
  p1: Point;
  p2: Point;
}

/**
 * Traces an image's brightness contours using the Marching Squares algorithm.
 * Returns a list of vectorized closed/open paths.
 */
function getLerpOffset(valA: number, valB: number, t: number): number {
  if (Math.abs(valA - valB) < 0.001) return 0.5;
  const fraction = (t - valA) / (valB - valA);
  // Clamp slightly away from 0 and 1 to prevent topological overlap
  return Math.max(0.01, Math.min(0.99, fraction));
}

/**
 * Subdivision algorithm (Chaikin's corner cutting) for smooth quadratic B-spline curves.
 * Creates elegant, rounded paths suitable for high-speed laser cuts.
 */
export function chaikinSubdivide(path: Point[], iterations: number = 2): Point[] {
  if (path.length <= 2) return path;

  let current = [...path];
  const isClosed = path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y;

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    const len = current.length;

    if (isClosed) {
      // For closed paths, process segments cyclically.
      // A closed path has (len - 1) unique points.
      const cycleLen = len - 1;
      for (let i = 0; i < cycleLen; i++) {
        const pA = current[i];
        const pB = current[(i + 1) % cycleLen];

        next.push({
          x: 0.75 * pA.x + 0.25 * pB.x,
          y: 0.75 * pA.y + 0.25 * pB.y,
        });
        next.push({
          x: 0.25 * pA.x + 0.75 * pB.x,
          y: 0.25 * pA.y + 0.75 * pB.y,
        });
      }
      // Re-close the loop
      if (next.length > 0) {
        next.push({ ...next[0] });
      }
    } else {
      // For open paths, keep the endpoints fixed
      next.push({ ...current[0] });
      for (let i = 0; i < len - 1; i++) {
        const pA = current[i];
        const pB = current[i + 1];

        const q = {
          x: 0.75 * pA.x + 0.25 * pB.x,
          y: 0.75 * pA.y + 0.25 * pB.y,
        };
        const r = {
          x: 0.25 * pA.x + 0.75 * pB.x,
          y: 0.25 * pA.y + 0.75 * pB.y,
        };

        if (i === 0) {
          next.push(r);
        } else if (i === len - 2) {
          next.push(q);
        } else {
          next.push(q);
          next.push(r);
        }
      }
      next.push({ ...current[len - 1] });
    }
    current = next;
  }
  return current;
}

/**
 * Traces an image's brightness contours using the Marching Squares algorithm with linear interpolation.
 * Returns a list of vectorized closed/open paths with beautifully rounded, high-resolution curves.
 */
export function traceImage(
  imgData: ImageData,
  threshold: number,
  invert: boolean,
  smoothEpsilon: number,
  autoBridge?: boolean,
  bridgeWidth?: number,
  bridgeType?: "global" | "per_island",
  bridgeDir?: "vertical" | "horizontal" | "cross" | "double_vertical" | "double_horizontal",
  islandBridgeMode?: "island_top" | "island_bottom" | "island_left" | "island_right" | "island_top_bottom" | "island_left_right" | "island_all_four",
  bridgeJitter?: number
): Point[][] {
  const width = imgData.width;
  const height = imgData.height;
  const data = imgData.data;

  // Helper to determine active state
  const isActive = (g: number): boolean => {
    return invert ? (g >= threshold) : (g < threshold);
  };

  // 1. Create a continuous intensity map (0-255) to allow high-precision linear interpolation (Lerp)
  const intensity = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];

    // Grayscale luminance formula
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (a < 30) {
      // Treat highly transparent pixels as white (background)
      gray = 255;
    }
    intensity[i] = gray;
  }

  const setBackground = (idx: number) => {
    if (idx >= 0 && idx < width * height) {
      intensity[idx] = invert ? 0 : 255;
    }
  };

  const drawVerticalBridgeLine = (cx: number, w: number) => {
    const half = w / 2;
    const xStart = Math.max(0, Math.floor(cx - half));
    const xEnd = Math.min(width - 1, Math.ceil(cx + half));
    for (let y = 0; y < height; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        setBackground(y * width + x);
      }
    }
  };

  const drawHorizontalBridgeLine = (cy: number, w: number) => {
    const half = w / 2;
    const yStart = Math.max(0, Math.floor(cy - half));
    const yEnd = Math.min(height - 1, Math.ceil(cy + half));
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = 0; x < width; x++) {
        setBackground(y * width + x);
      }
    }
  };

  // Apply Global Bridges
  if (autoBridge && bridgeType === "global" && bridgeWidth && bridgeWidth > 0) {
    if (bridgeDir === "vertical" || bridgeDir === "cross") {
      drawVerticalBridgeLine(width / 2, bridgeWidth);
    }
    if (bridgeDir === "horizontal" || bridgeDir === "cross") {
      drawHorizontalBridgeLine(height / 2, bridgeWidth);
    }
    if (bridgeDir === "double_vertical") {
      drawVerticalBridgeLine(width * 0.33, bridgeWidth);
      drawVerticalBridgeLine(width * 0.66, bridgeWidth);
    }
    if (bridgeDir === "double_horizontal") {
      drawHorizontalBridgeLine(height * 0.33, bridgeWidth);
      drawHorizontalBridgeLine(height * 0.66, bridgeWidth);
    }
  }

  // Apply Per-Island Bridges
  if (autoBridge && bridgeType === "per_island" && bridgeWidth && bridgeWidth > 0 && islandBridgeMode) {
    // Clone original intensity grid so we can run smart raycast collision checks against untouched image states
    const originalIntensity = new Float32Array(intensity);
    const isOriginalActive = (cx: number, cy: number): boolean => {
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
        return false;
      }
      return isActive(originalIntensity[cy * width + cx]);
    };

    // Fast distance-to-segment helper for arbitrary-angle thick capsule drawing
    const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return Math.hypot(px - ax, py - ay);
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = ax + t * dx;
      const projY = ay + t * dy;
      return Math.hypot(px - projX, py - projY);
    };

    // Casts a high-precision ray from an anchor point outward across active cut-lines
    const castRayAcrossActive = (start: Point, angle: number): { distance: number; stopPoint: Point } | null => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
     
      let foundActive = false;
      const maxDist = Math.max(width, height);
      const step = 0.5; // step half a pixel at a time for high-precision tracing
     
      for (let d = 0; d < maxDist; d += step) {
        const px = start.x + cos * d;
        const py = start.y + sin * d;
       
        // Check if we hit the edge of the stencil canvas
        if (px < 0 || px >= width || py < 0 || py >= height) {
          if (foundActive) {
            const clampX = Math.max(0, Math.min(width - 1, px));
            const clampY = Math.max(0, Math.min(height - 1, py));
            return { distance: d, stopPoint: { x: clampX, y: clampY } };
          }
          return null;
        }
       
        const active = isOriginalActive(Math.round(px), Math.round(py));
        if (active) {
          foundActive = true;
        } else {
          if (foundActive) {
            // We crossed the cut line and hit solid material!
            return { distance: d, stopPoint: { x: px, y: py } };
          }
        }
      }
      return null;
    };

    // Run an initial quick trace to find the original contours
    const tempPaths = traceImageRaw(intensity, width, height, threshold, invert);
    const jitterAmount = bridgeJitter !== undefined ? bridgeJitter : 15;

    for (const path of tempPaths) {
      if (path.length < 3) continue;

      const first = path[0];
      const last = path[path.length - 1];
      const isClosed = Math.hypot(first.x - last.x, first.y - last.y) < 1.0;
      if (!isClosed) continue;

      // Find extreme point indices
      let minXIdx = 0, maxXIdx = 0, minYIdx = 0, maxYIdx = 0;
      for (let i = 1; i < path.length; i++) {
        if (path[i].x < path[minXIdx].x) minXIdx = i;
        if (path[i].x > path[maxXIdx].x) maxXIdx = i;
        if (path[i].y < path[minYIdx].y) minYIdx = i;
        if (path[i].y > path[maxYIdx].y) maxYIdx = i;
      }

      // If jitter is requested, apply a stable deterministic index offset along the path
      let indexOffset = 0;
      // Calculate a stable hash for this shape based on its geometric layout
      let hash = 0;
      const step = Math.max(1, Math.floor(path.length / 5));
      for (let i = 0; i < path.length; i += step) {
        hash += path[i].x * 12.34 + path[i].y * 56.78;
      }
      const hashVal = Math.sin(hash) < 0 ? Math.abs(Math.sin(hash)) : Math.sin(hash);
      const hashFract = hashVal % 1;

      if (jitterAmount > 0) {
        // Let position jitter range up to ±20% of path length
        const maxJitterFrac = (jitterAmount / 100) * 0.40;
        const jitterFrac = (hashFract - 0.5) * maxJitterFrac;
        indexOffset = Math.round(jitterFrac * path.length);
      }

      const yMinIdx = (minYIdx + indexOffset + path.length) % path.length;
      const yMaxIdx = (maxYIdx + indexOffset + path.length) % path.length;
      const xMinIdx = (minXIdx + indexOffset + path.length) % path.length;
      const xMaxIdx = (maxXIdx + indexOffset + path.length) % path.length;

      const drawClosestBridgeRay = (start: Point, hintAngle: number) => {
        // Find the best angle in a 120-degree cone around the direction hint to minimize bridge length
        const numAngles = 21; // Sample 21 directions
        let minDistance = Infinity;
        let bestStopPoint: Point = start;
        let bestAngle = hintAngle;

        for (let i = 0; i < numAngles; i++) {
          const offset = ((i - (numAngles - 1) / 2) / ((numAngles - 1) / 2)) * (Math.PI / 3); // -60 to +60 degrees
          const angle = hintAngle + offset;
          const ray = castRayAcrossActive(start, angle);
          if (ray && ray.distance < minDistance) {
            minDistance = ray.distance;
            bestStopPoint = ray.stopPoint;
            bestAngle = angle;
          }
        }

        // If we found a valid crossing, let's draw the bridge
        if (minDistance < Infinity) {
          let finalStopPoint = bestStopPoint;

          // Apply angle staggering/randomization if requested
          if (jitterAmount > 0) {
            // Let angular jitter range up to ±30 degrees at 100% jitter setting
            const maxAngleJitter = (jitterAmount / 100) * (Math.PI / 6);
            const angleOffset = (hashFract - 0.5) * 2 * maxAngleJitter;
            const jitteredAngle = bestAngle + angleOffset;

            // Recast the ray at the jittered angle
            const jitteredRay = castRayAcrossActive(start, jitteredAngle);
            if (jitteredRay) {
              finalStopPoint = jitteredRay.stopPoint;
            }
          }

          // Draw thick capsule-shaped bridge
          const halfWidth = bridgeWidth / 2;
          const ax = start.x;
          const ay = start.y;
          const bx = finalStopPoint.x;
          const by = finalStopPoint.y;

          const minX = Math.max(0, Math.floor(Math.min(ax, bx) - halfWidth - 1));
          const maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx) + halfWidth + 1));
          const minY = Math.max(0, Math.floor(Math.min(ay, by) - halfWidth - 1));
          const maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by) + halfWidth + 1));

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              if (distanceToSegment(x, y, ax, ay, bx, by) <= halfWidth) {
                setBackground(y * width + x);
              }
            }
          }
        }
      };

      if (islandBridgeMode === "island_top" || islandBridgeMode === "island_top_bottom" || islandBridgeMode === "island_all_four") {
        drawClosestBridgeRay(path[yMinIdx], -Math.PI / 2); // Top: aim up
      }
      if (islandBridgeMode === "island_bottom" || islandBridgeMode === "island_top_bottom" || islandBridgeMode === "island_all_four") {
        drawClosestBridgeRay(path[yMaxIdx], Math.PI / 2); // Bottom: aim down
      }
      if (islandBridgeMode === "island_left" || islandBridgeMode === "island_left_right" || islandBridgeMode === "island_all_four") {
        drawClosestBridgeRay(path[xMinIdx], Math.PI); // Left: aim left
      }
      if (islandBridgeMode === "island_right" || islandBridgeMode === "island_left_right" || islandBridgeMode === "island_all_four") {
        drawClosestBridgeRay(path[xMaxIdx], 0); // Right: aim right
      }
    }
  }

  // Helper to retrieve intensity values safely
  const getIntensity = (cx: number, cy: number): number => {
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
      return 255; // Default white (background) out of bounds
    }
    return intensity[cy * width + cx];
  };

  const segments: Segment[] = [];

  // 2. Perform Marching Squares cell-by-cell using Linear Interpolation (Lerp) with virtual padding
  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const g0 = getIntensity(x, y);         // Top-left
      const g1 = getIntensity(x + 1, y);     // Top-right
      const g2 = getIntensity(x + 1, y + 1); // Bottom-right
      const g3 = getIntensity(x, y + 1);     // Bottom-left

      const v0 = isActive(g0) ? 1 : 0;
      const v1 = isActive(g1) ? 1 : 0;
      const v2 = isActive(g2) ? 1 : 0;
      const v3 = isActive(g3) ? 1 : 0;

      const index = (v0 << 3) | (v1 << 2) | (v2 << 1) | v3;

      const clampX = (val: number) => Math.max(0, Math.min(width - 1, val));
      const clampY = (val: number) => Math.max(0, Math.min(height - 1, val));

      // Linear interpolation yields smooth sub-pixel edge positions, resolving jagged steps
      const t = { x: clampX(x + getLerpOffset(g0, g1, threshold)), y: clampY(y) };
      const r = { x: clampX(x + 1), y: clampY(y + getLerpOffset(g1, g2, threshold)) };
      const b = { x: clampX(x + getLerpOffset(g3, g2, threshold)), y: clampY(y + 1) };
      const l = { x: clampX(x), y: clampY(y + getLerpOffset(g0, g3, threshold)) };

      switch (index) {
        case 1:
          segments.push({ p1: l, p2: b });
          break;
        case 2:
          segments.push({ p1: b, p2: r });
          break;
        case 3:
          segments.push({ p1: l, p2: r });
          break;
        case 4:
          segments.push({ p1: t, p2: r });
          break;
        case 5:
          segments.push({ p1: l, p2: t });
          segments.push({ p1: b, p2: r });
          break;
        case 6:
          segments.push({ p1: t, p2: b });
          break;
        case 7:
          segments.push({ p1: l, p2: t });
          break;
        case 8:
          segments.push({ p1: l, p2: t });
          break;
        case 9:
          segments.push({ p1: t, p2: b });
          break;
        case 10:
          segments.push({ p1: l, p2: b });
          segments.push({ p1: t, p2: r });
          break;
        case 11:
          segments.push({ p1: t, p2: r });
          break;
        case 12:
          segments.push({ p1: l, p2: r });
          break;
        case 13:
          segments.push({ p1: b, p2: r });
          break;
        case 14:
          segments.push({ p1: l, p2: b });
          break;
        default:
          break;
      }
    }
  }

  // 3. Stitch segments together into continuous loops (paths)
  const paths = stitchSegments(segments);

  // 4. Smooth and simplify paths to generate beautifully curved geometries
  let processedPaths = paths;
  if (smoothEpsilon > 0) {
    // A. Light initial Ramer-Douglas-Peucker pass to eliminate noisy microscopic pixel wobbles
    processedPaths = paths.map((path) => ramerDouglasPeucker(path, 0.25));

    // B. Apply Chaikin subdivision curves to smooth corners into gorgeous curves
    const chaikinIterations = Math.min(3, Math.max(1, Math.round(smoothEpsilon * 1.5)));
    processedPaths = processedPaths.map((path) => chaikinSubdivide(path, chaikinIterations));

    // C. Binomial moving average pass for seamless transitions
    processedPaths = processedPaths.map((path) => smoothPathCoordinates(path, 2));

    // D. Final extremely light simplification to discard perfectly redundant linear points on straight lines
    processedPaths = processedPaths.map((path) => ramerDouglasPeucker(path, smoothEpsilon * 0.15));
  }

  return processedPaths;
}

/**
 * Smooths a 2D path's coordinates using a binomial low-pass filter
 * (weighted moving average). Supports wrapping for closed loops to prevent
 * kinking or gaps at the start/end points.
 */
export function smoothPathCoordinates(path: Point[], iterations: number = 3): Point[] {
  if (path.length <= 2) return path;

  const isClosed = path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y;
  let current = [...path];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    const len = current.length;

    for (let i = 0; i < len; i++) {
      if (isClosed) {
        // Closed loop wrapping.
        // We have len points, where current[0] and current[len - 1] are identical.
        // We treat the cycle length as (len - 1) to avoid duplication.
        const nCycle = len - 1;
        const idx = i === len - 1 ? 0 : i;

        const prevIdx = (idx - 1 + nCycle) % nCycle;
        const nextIdx = (idx + 1) % nCycle;

        const prevPt = current[prevIdx];
        const currPt = current[idx];
        const nextPt = current[nextIdx];

        // Apply a 1-2-1 kernel (0.25, 0.5, 0.25)
        next.push({
          x: 0.25 * prevPt.x + 0.5 * currPt.x + 0.25 * nextPt.x,
          y: 0.25 * prevPt.y + 0.5 * currPt.y + 0.25 * nextPt.y,
        });
      } else {
        // Open path: keep endpoints fixed, smooth interior points
        if (i === 0 || i === len - 1) {
          next.push({ ...current[i] });
        } else {
          const prevPt = current[i - 1];
          const currPt = current[i];
          const nextPt = current[i + 1];

          next.push({
            x: 0.25 * prevPt.x + 0.5 * currPt.x + 0.25 * nextPt.x,
            y: 0.25 * prevPt.y + 0.5 * currPt.y + 0.25 * nextPt.y,
          });
        }
      }
    }

    if (isClosed && next.length > 0) {
      // Keep closure perfectly identical
      next[next.length - 1] = { ...next[0] };
    }
    current = next;
  }

  return current;
}

/**
 * Fast O(N) stitching of segments.
 */
function stitchSegments(segments: Segment[]): Point[][] {
  const getHash = (pt: Point) => {
    // Points are on half-pixels, so multiplying by 2 yields unique integers
    const hx = Math.round(pt.x * 2);
    const hy = Math.round(pt.y * 2);
    return `${hx},${hy}`;
  };

  // Filter out degenerate segments where endpoints clamp to the same point
  const validSegments = segments.filter(seg => {
    return getHash(seg.p1) !== getHash(seg.p2);
  });

  const adj = new Map<string, Segment[]>();

  for (const seg of validSegments) {
    const h1 = getHash(seg.p1);
    const h2 = getHash(seg.p2);

    if (!adj.has(h1)) adj.set(h1, []);
    if (!adj.has(h2)) adj.set(h2, []);

    adj.get(h1)!.push(seg);
    adj.get(h2)!.push(seg);
  }

  const visited = new Set<Segment>();
  const paths: Point[][] = [];

  for (const startSeg of validSegments) {
    if (visited.has(startSeg)) continue;

    visited.add(startSeg);
    const path: Point[] = [startSeg.p1, startSeg.p2];

    // Extend end
    let currentPt = startSeg.p2;
    let done = false;
    while (!done) {
      const hash = getHash(currentPt);
      const candidates = adj.get(hash) || [];
      let found = false;
      for (const seg of candidates) {
        if (!visited.has(seg)) {
          visited.add(seg);
          const nextPt = getHash(seg.p1) === hash ? seg.p2 : seg.p1;
          path.push(nextPt);
          currentPt = nextPt;
          found = true;
          break;
        }
      }
      if (!found) {
        done = true;
      }
    }

    // Extend start
    currentPt = path[0];
    done = false;
    while (!done) {
      const hash = getHash(currentPt);
      const candidates = adj.get(hash) || [];
      let found = false;
      for (const seg of candidates) {
        if (!visited.has(seg)) {
          visited.add(seg);
          const nextPt = getHash(seg.p1) === hash ? seg.p2 : seg.p1;
          path.unshift(nextPt);
          currentPt = nextPt;
          found = true;
          break;
        }
      }
      if (!found) {
        done = true;
      }
    }

    if (path.length > 2) {
      // If start and end points are almost identical, make them match exactly
      const startHash = getHash(path[0]);
      const endHash = getHash(path[path.length - 1]);
      if (startHash === endHash) {
        path[path.length - 1] = { ...path[0] };
      }
      paths.push(path);
    }
  }

  return paths;
}

/**
 * Simplifies a 2D path of points using the Ramer-Douglas-Peucker algorithm.
 */
function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const results1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const results2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return results1.slice(0, results1.length - 1).concat(results2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((p.x - p1.x) ** 2 + (p.y - p1.y) ** 2);
  }
  const num = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
  const den = Math.sqrt(dx * dx + dy * dy);
  return num / den;
}

/**
 * Clips a path (array of Points) against a single vertical/horizontal coordinate strip.
 * Computes exact intersection boundary coordinates to keep cutting lines perfectly crisp.
 */
export function clipPathAgainstStrip(
  path: Point[],
  getVal: (p: Point) => number,
  vMin: number,
  vMax: number
): Point[][] {
  if (path.length === 0) return [];

  const results: Point[][] = [];
  let currentSegment: Point[] = [];

  const isInside = (p: Point) => {
    const val = getVal(p);
    return val >= vMin && val <= vMax;
  };

  const len = path.length;
  for (let i = 0; i < len; i++) {
    const pt = path[i];
    const ptInside = isInside(pt);

    if (!ptInside) {
      currentSegment.push(pt);
    } else {
      if (currentSegment.length > 1) {
        results.push(currentSegment);
      }
      currentSegment = [];
    }

    if (i < len - 1) {
      const nextPt = path[i + 1];
      const nextInside = isInside(nextPt);

      if (ptInside !== nextInside) {
        const val1 = getVal(pt);
        const val2 = getVal(nextPt);
       
        let intersectVal = vMin;
        if ((val1 < vMin && val2 > vMin) || (val1 > vMin && val2 < vMin)) {
          intersectVal = vMin;
        } else {
          intersectVal = vMax;
        }

        let t = 0.5;
        if (Math.abs(val1 - val2) > 0.001) {
          t = (intersectVal - val1) / (val2 - val1);
        }
       
        const intersectPt: Point = {
          x: pt.x + t * (nextPt.x - pt.x),
          y: pt.y + t * (nextPt.y - pt.y),
        };

        if (ptInside && !nextInside) {
          currentSegment.push(intersectPt);
        } else if (!ptInside && nextInside) {
          currentSegment.push(intersectPt);
          if (currentSegment.length > 1) {
            results.push(currentSegment);
          }
          currentSegment = [];
        }
      }
    }
  }

  if (currentSegment.length > 1) {
    results.push(currentSegment);
  }

  return results;
}

/**
 * For closed paths that were cut into segments, merges the start and end segments
 * if they are contiguous at the wrap-around point (to avoid double splits).
 */
export function mergeClosedPathSegments(segments: Point[][], wasClosed: boolean): Point[][] {
  if (segments.length <= 1 || !wasClosed) return segments;

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const firstPt = firstSeg[0];
  const lastPt = lastSeg[lastSeg.length - 1];

  const dist = Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y);
  if (dist < 0.2) {
    const merged = [...lastSeg.slice(0, -1), ...firstSeg];
    return [merged, ...segments.slice(1, -1)];
  }

  return segments;
}

/**
 * Applies physical stencil bridges across all vectorized path boundaries.
 * Removes line parts intersecting specified center or double-span columns/rows,
 * ensuring islands remain physically linked to the background mainland when cut.
 */
export function applyStencilBridges(
  paths: Point[][],
  imgWidth: number,
  imgHeight: number,
  bridgeWidth: number,
  mode: "vertical" | "horizontal" | "cross" | "double_vertical" | "double_horizontal"
): Point[][] {
  if (bridgeWidth <= 0 || paths.length === 0) return paths;

  let currentPaths = [...paths];
  const strips: { getVal: (p: Point) => number; vMin: number; vMax: number }[] = [];

  const addVerticalStrip = (cx: number) => {
    strips.push({
      getVal: (p: Point) => p.x,
      vMin: cx - bridgeWidth / 2,
      vMax: cx + bridgeWidth / 2,
    });
  };

  const addHorizontalStrip = (cy: number) => {
    strips.push({
      getVal: (p: Point) => p.y,
      vMin: cy - bridgeWidth / 2,
      vMax: cy + bridgeWidth / 2,
    });
  };

  if (mode === "vertical" || mode === "cross") {
    addVerticalStrip(imgWidth / 2);
  }
  if (mode === "horizontal" || mode === "cross") {
    addHorizontalStrip(imgHeight / 2);
  }
  if (mode === "double_vertical") {
    addVerticalStrip(imgWidth * 0.33);
    addVerticalStrip(imgWidth * 0.66);
  }
  if (mode === "double_horizontal") {
    addHorizontalStrip(imgHeight * 0.33);
    addHorizontalStrip(imgHeight * 0.66);
  }

  for (const strip of strips) {
    const nextPaths: Point[][] = [];
    for (const path of currentPaths) {
      if (path.length < 2) continue;
      const isClosed = path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y;
     
      const clipped = clipPathAgainstStrip(path, strip.getVal, strip.vMin, strip.vMax);
      const merged = mergeClosedPathSegments(clipped, isClosed);
     
      nextPaths.push(...merged);
    }
    currentPaths = nextPaths;
  }

  return currentPaths;
}

/**
 * Automatically identifies all closed stencil islands (closed paths) in the traced image,
 * and carves out precise physical bridges (solid tabs) at the island's extreme boundaries.
 * This guarantees that internal cutouts (such as the centers of letters like A, O, D, B)
 * remain physically tethered to the main substrate when laser cut.
 */
export function applyPerIslandBridges(
  paths: Point[][],
  bridgeWidth: number,
  mode: "island_top" | "island_bottom" | "island_left" | "island_right" | "island_top_bottom" | "island_left_right" | "island_all_four"
): Point[][] {
  if (bridgeWidth <= 0 || paths.length === 0) return paths;

  const resultPaths: Point[][] = [];

  for (const path of paths) {
    if (path.length < 3) {
      resultPaths.push(path);
      continue;
    }

    const first = path[0];
    const last = path[path.length - 1];
    const isClosed = Math.hypot(first.x - last.x, first.y - last.y) < 1.0;

    if (!isClosed) {
      // Open paths do not form islands, so they don't need stencil bridges.
      resultPaths.push(path);
      continue;
    }

    // 1. Identify extreme point indices of this closed path
    let minXIdx = 0, maxXIdx = 0, minYIdx = 0, maxYIdx = 0;
    for (let i = 1; i < path.length; i++) {
      if (path[i].x < path[minXIdx].x) minXIdx = i;
      if (path[i].x > path[maxXIdx].x) maxXIdx = i;
      if (path[i].y < path[minYIdx].y) minYIdx = i;
      if (path[i].y > path[maxYIdx].y) maxYIdx = i;
    }

    // 2. Select target points based on the chosen mode
    const targetPoints: Point[] = [];
    if (mode === "island_top" || mode === "island_top_bottom" || mode === "island_all_four") {
      targetPoints.push(path[minYIdx]);
    }
    if (mode === "island_bottom" || mode === "island_top_bottom" || mode === "island_all_four") {
      targetPoints.push(path[maxYIdx]);
    }
    if (mode === "island_left" || mode === "island_left_right" || mode === "island_all_four") {
      targetPoints.push(path[minXIdx]);
    }
    if (mode === "island_right" || mode === "island_left_right" || mode === "island_all_four") {
      targetPoints.push(path[maxXIdx]);
    }

    // 3. For unique points (excluding the duplicate closure point at the end)
    const uniquePts = path.slice(0, -1);
    const len = uniquePts.length;

    // Determine which points to keep
    const keep = new Array<boolean>(len);
    for (let i = 0; i < len; i++) {
      const pt = uniquePts[i];
      // Check if this point is within bridgeWidth / 2 of any target point
      let withinBridge = false;
      for (const t of targetPoints) {
        if (Math.hypot(pt.x - t.x, pt.y - t.y) < bridgeWidth / 2) {
          withinBridge = true;
          break;
        }
      }
      keep[i] = !withinBridge;
    }

    // Check if there are any gaps (any false values in keep)
    const firstGapIdx = keep.indexOf(false);
    if (firstGapIdx === -1) {
      // No points were removed; keep original path
      resultPaths.push(path);
      continue;
    }

    // 4. Traverse circularly starting from firstGapIdx to form segments
    const segments: Point[][] = [];
    let currentSegment: Point[] = [];

    for (let i = 0; i < len; i++) {
      const idx = (firstGapIdx + i) % len;
      if (keep[idx]) {
        currentSegment.push(uniquePts[idx]);
      } else {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [];
      }
    }
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }

    // Add all carved segments
    resultPaths.push(...segments);
  }

  return resultPaths;
}

/**
 * Perform a raw trace on a Float32Array intensity map using Marching Squares without smoothing or decimation.
 * Used internally for ultra-fast first-pass detection of closed island geometries.
 */
function traceImageRaw(
  intensity: Float32Array,
  width: number,
  height: number,
  threshold: number,
  invert: boolean
): Point[][] {
  const isActive = (g: number): boolean => {
    return invert ? (g >= threshold) : (g < threshold);
  };

  const segments: Segment[] = [];

  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const getVal = (cx: number, cy: number): number => {
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
          return 255;
        }
        return intensity[cy * width + cx];
      };

      const g0 = getVal(x, y);
      const g1 = getVal(x + 1, y);
      const g2 = getVal(x + 1, y + 1);
      const g3 = getVal(x, y + 1);

      const v0 = isActive(g0) ? 1 : 0;
      const v1 = isActive(g1) ? 1 : 0;
      const v2 = isActive(g2) ? 1 : 0;
      const v3 = isActive(g3) ? 1 : 0;

      const index = (v0 << 3) | (v1 << 2) | (v2 << 1) | v3;

      const clampX = (val: number) => Math.max(0, Math.min(width - 1, val));
      const clampY = (val: number) => Math.max(0, Math.min(height - 1, val));

      const t = { x: clampX(x + 0.5), y: clampY(y) };
      const r = { x: clampX(x + 1), y: clampY(y + 0.5) };
      const b = { x: clampX(x + 0.5), y: clampY(y + 1) };
      const l = { x: clampX(x), y: clampY(y + 0.5) };

      switch (index) {
        case 1: segments.push({ p1: l, p2: b }); break;
        case 2: segments.push({ p1: b, p2: r }); break;
        case 3: segments.push({ p1: l, p2: r }); break;
        case 4: segments.push({ p1: t, p2: r }); break;
        case 5:
          segments.push({ p1: l, p2: t });
          segments.push({ p1: b, p2: r });
          break;
        case 6: segments.push({ p1: t, p2: b }); break;
        case 7: segments.push({ p1: l, p2: t }); break;
        case 8: segments.push({ p1: l, p2: t }); break;
        case 9: segments.push({ p1: t, p2: b }); break;
        case 10:
          segments.push({ p1: l, p2: b });
          segments.push({ p1: t, p2: r });
          break;
        case 11: segments.push({ p1: t, p2: r }); break;
        case 12: segments.push({ p1: l, p2: r }); break;
        case 13: segments.push({ p1: b, p2: r }); break;
        case 14: segments.push({ p1: l, p2: b }); break;
      }
    }
  }

  return stitchSegments(segments);
}
