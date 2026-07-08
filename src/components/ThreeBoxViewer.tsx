/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PanelData, BoxParams } from '../lib/boxGeometry';
import { Rotate3d, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ThreeBoxViewerProps {
  panels: PanelData[];
  params: BoxParams;
  explode: number; // 0 (assembled) to 100 (fully exploded)
  showLabels?: boolean;
  materialColor?: string;
  wireframeMode?: boolean;
  materialType?: string;
}

export default function ThreeBoxViewer({
  panels,
  params,
  explode,
  showLabels = false,
  materialColor = '#e0b98a', // Default Birch wood color
  wireframeMode = false,
  materialType = 'birch'
}: ThreeBoxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Keep references of scene and pivot for active updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const panelsGroupRef = useRef<THREE.Group | null>(null);

  // Orbit control state (using ref to avoid re-initializing THREE instance)
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraDistanceRef = useRef(350);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Track panel references to update positions dynamically upon slider change
  const panelMeshesMapRef = useRef<Map<string, THREE.Group>>(new Map());

  // Generate 3D geometry and meshes from 2D panel points
  const rebuild3DBox = () => {
    const parentContainer = panelsGroupRef.current;
    if (!parentContainer) return;

    // Clear previous elements
    while (parentContainer.children.length > 0) {
      parentContainer.remove(parentContainer.children[0]);
    }
    panelMeshesMapRef.current.clear();

    const { width: W, height: H, depth: D, thickness: t } = params;

    const isAcrylic = materialType === 'acrylic';
    const isMdf = materialType === 'mdf';

    const faceMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialColor),
      roughness: isAcrylic ? 0.1 : isMdf ? 0.5 : 0.6,
      metalness: isAcrylic ? 0.2 : 0.1,
      transparent: isAcrylic,
      opacity: isAcrylic ? 0.55 : 1.0,
      side: THREE.DoubleSide,
      wireframe: wireframeMode,
    });

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: isAcrylic ? new THREE.Color(materialColor) : isMdf ? new THREE.Color('#4c321c') : new THREE.Color('#5c4033'), // MDF has slightly lighter/finer burnt edge, acrylic has polished clean edge
      roughness: isAcrylic ? 0.1 : 0.8,
      metalness: isAcrylic ? 0.1 : 0.05,
      transparent: isAcrylic,
      opacity: isAcrylic ? 0.65 : 1.0,
      wireframe: wireframeMode,
    });

    const materials = {
      face: faceMaterial,
      edge: edgeMaterial,
      line: new THREE.LineBasicMaterial({
        color: isAcrylic ? new THREE.Color('#228888') : new THREE.Color('#332211'),
        linewidth: 1.5 // Standard line width
      })
    };

    panels.forEach((panel) => {
      const shape = new THREE.Shape();
      if (panel.points.length === 0) return;

      // Create a 2D shape path
      shape.moveTo(panel.points[0].x, panel.points[0].y);
      for (let i = 1; i < panel.points.length; i++) {
        shape.lineTo(panel.points[i].x, panel.points[i].y);
      }
      shape.closePath();

      // Extrude internal holes/cutouts (circles, mortises, slide tracks)
      if (panel.holes) {
        panel.holes.forEach((holePoints) => {
          if (holePoints.length === 0) return;
          const holePath = new THREE.Path();
          holePath.moveTo(holePoints[0].x, holePoints[0].y);
          for (let i = 1; i < holePoints.length; i++) {
            holePath.lineTo(holePoints[i].x, holePoints[i].y);
          }
          holePath.closePath();
          shape.holes.push(holePath);
        });
      }

      // Extrude 2D shape with the material thickness
      const extrudeSettings = {
        depth: t,
        bevelEnabled: false
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // We shift the extruded geometry so its local center is at its local 3D origin (0, 0, 0)
      geometry.translate(-panel.width / 2, -panel.height / 2, -t / 2);

      // Create mesh
      const mesh = new THREE.Mesh(geometry, [materials.face, materials.edge]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Outline edge lines to make finger joints pop beautifully
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const lineSegments = new THREE.LineSegments(edgesGeometry, materials.line);

      // Panel Group to hold the mesh and line outline
      const panelGroup = new THREE.Group();
      panelGroup.add(mesh);
      panelGroup.add(lineSegments);

      // Render engrave lines on the front face of the panel
      if (panel.engravePaths && panel.engravePaths.length > 0) {
        const engraveLinesGroup = new THREE.Group();
        const engraveMaterial = new THREE.LineBasicMaterial({
          color: 0x0ea5e9, // Cyan laser blue engraving lines
          linewidth: 2,
          transparent: true,
          opacity: 0.95,
          depthWrite: false
        });

        panel.engravePaths.forEach((path) => {
          if (path.length < 2) return;
          const points3D: THREE.Vector3[] = [];
          path.forEach((pt) => {
            points3D.push(new THREE.Vector3(
              pt.x - panel.width / 2,
              panel.height / 2 - pt.y,
              t / 2 + 0.1 // offset outward slightly to avoid z-fighting on wood texture
            ));
          });
          
          const first = path[0];
          const last = path[path.length - 1];
          if (first && last && Math.hypot(first.x - last.x, first.y - last.y) < 0.1) {
            points3D.push(new THREE.Vector3(
              first.x - panel.width / 2,
              panel.height / 2 - first.y,
              t / 2 + 0.1
            ));
          }

          const lineGeom = new THREE.BufferGeometry().setFromPoints(points3D);
          const line = new THREE.Line(lineGeom, engraveMaterial);
          engraveLinesGroup.add(line);
        });

        panelGroup.add(engraveLinesGroup);
      }

      // Place and rotate panel into its correct 3D location
      let basePos = new THREE.Vector3();
      let rotation = new THREE.Euler();
      let normal = new THREE.Vector3();

      const isLidSliding = params.boxType === 'removable-lid' && params.lidType === 'sliding';
      const isLidHinged = params.boxType === 'removable-lid' && params.lidType === 'hinged';

      if (panel.id === 'bottom') {
        basePos.set(0, -H / 2 + t / 2, 0);
        rotation.set(Math.PI / 2, 0, 0);
        normal.set(0, -1, 0);
      } else if (panel.id === 'top') {
        if (isLidSliding) {
          // Slide groove sits flush with the top of the box. Lid is recessed under the top rail: top of lid is H/2 - t - 0.2, center is H/2 - 1.5*t - 0.2.
          basePos.set(0, H / 2 - 1.5 * t - 0.2, t / 2 + 7.5);
          rotation.set(-Math.PI / 2, 0, 0);
          normal.set(0, 0, 1.25); // Slides out forward smoothly along Z-axis!
        } else if (isLidHinged) {
          // Hinged lid sits exactly aligned with side sockets at y = H/2 - 6, pivot is t+10 from back
          basePos.set(0, H / 2 - 6, 8.5);
          rotation.set(-Math.PI / 2, 0, 0);
          normal.set(0, 1, 0); // Hinged lid custom rotation calculated in updateExplosion
        } else {
          basePos.set(0, H / 2 - t / 2, 0);
          rotation.set(-Math.PI / 2, 0, 0);
          normal.set(0, 1, 0);
        }
      } else if (panel.id === 'front') {
        if (isLidSliding) {
          // lowered front panel height to be flush with the bottom guide strip top surface
          const fHeight = H - 2 * t - 0.4;
          basePos.set(0, -H / 2 + fHeight / 2, D / 2 - t / 2);
        } else {
          basePos.set(0, 0, D / 2 - t / 2);
        }
        rotation.set(0, 0, 0);
        normal.set(0, 0, 1);
      } else if (panel.id === 'back') {
        basePos.set(0, 0, -D / 2 + t / 2);
        rotation.set(0, Math.PI, 0);
        normal.set(0, 0, -1);
      } else if (panel.id === 'left') {
        basePos.set(-W / 2 + t / 2, 0, 0);
        rotation.set(0, -Math.PI / 2, 0);
        normal.set(-1, 0, 0);
      } else if (panel.id === 'left_bottom_guide') {
        // Horizontal bottom guide strip inside Left wall
        basePos.set(-W / 2 + t + 7.5, H / 2 - 2.5 * t - 0.4, 0);
        rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        normal.set(-1, 0, 0); // Explodes with the left wall outwards
      } else if (panel.id === 'right') {
        basePos.set(W / 2 - t / 2, 0, 0);
        rotation.set(0, Math.PI / 2, 0);
        normal.set(1, 0, 0);
      } else if (panel.id === 'right_bottom_guide') {
        // Horizontal bottom guide strip inside Right wall
        basePos.set(W / 2 - t - 7.5, H / 2 - 2.5 * t - 0.4, 0);
        rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        normal.set(1, 0, 0); // Explodes with the right wall outwards
      } else if (panel.id === 'top_rail_frame') {
        // Unified U-shaped Top Railing Frame (Flush top lip)
        basePos.set(0, H / 2 - t / 2, 0);
        rotation.set(-Math.PI / 2, 0, 0);
        normal.set(0, 1, 0); // Explodes straight upwards!
      } else if (panel.id === 'lid_handle') {
        // Interlocking arched handle key sits vertically on top of drop lid
        basePos.set(0, H / 2 + 12.5, 0);
        rotation.set(0, 0, 0);
        normal.set(0, 1, 0); // slides straight up in unison with Lid
      }

      panelGroup.position.copy(basePos);
      panelGroup.rotation.copy(rotation);

      // Save custom attributes on the Three group object for easy animation/explosion later
      panelGroup.userData = {
        basePosition: basePos.clone(),
        rotation: rotation.clone(),
        normal: normal.clone(),
        id: panel.id
      };

      parentContainer.add(panelGroup);
      panelMeshesMapRef.current.set(panel.id, panelGroup);
    });

    // Update positions right away based on current explode slider state
    updateExplosion();
  };

  // Move the panel groups outward along their nominal normal directions
  const updateExplosion = () => {
    panelMeshesMapRef.current.forEach((panelGroup) => {
      const { basePosition, rotation, normal, id } = panelGroup.userData;
      if (basePosition && normal) {
        if (id === 'top' && params.boxType === 'removable-lid' && params.lidType === 'hinged') {
          // Autodesk Fusion style swivel arm/hinge swing!
          const angle = (explode / 100) * (Math.PI * 0.65); // Rotate open up to ~117 degrees
          const localPivotZ = -params.depth / 2 + params.thickness + 10;
          
          const dz = basePosition.z - localPivotZ;
          const newZ = localPivotZ + Math.cos(angle) * dz;
          const newY = basePosition.y - Math.sin(angle) * dz;
          
          panelGroup.position.set(0, newY, newZ);
          panelGroup.rotation.set(-Math.PI / 2 + angle, 0, 0);
        } else {
          // Standard linear translation
          const explodeAmt = explode * 0.8;
          const newPos = basePosition.clone().add(normal.clone().multiplyScalar(explodeAmt));
          panelGroup.position.copy(newPos);
          
          // Restore original rotation
          if (rotation) {
            panelGroup.rotation.copy(rotation);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setWebglError("WebGL context lost. The browser might have suspended the WebGL context.");
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // INTERACTION EVENT HANDLERS
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !pivotRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      // Rotate around horizontal (Y-axis) and vertical (X-axis)
      pivotRef.current.rotation.y += deltaX * 0.007;

      // Constraint rotation on vertical axis to avoid complete tipping upside-down
      const nextRotX = pivotRef.current.rotation.x + deltaY * 0.007;
      pivotRef.current.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, nextRotX));

      previousMousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Support touch devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !pivotRef.current || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;

      pivotRef.current.rotation.y += deltaX * 0.007;

      const nextRotX = pivotRef.current.rotation.x + deltaY * 0.007;
      pivotRef.current.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, nextRotX));

      previousMousePositionRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const maxDim = Math.max(params.width, params.height, params.depth);

    // Zoom wheel handler
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const minDistance = maxDim * 1.1;
      const maxDistance = maxDim * 8.0;

      // Modify target camera distance relative to box sizing
      const zoomSpeed = maxDim * 0.15;
      const change = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;

      cameraDistanceRef.current = Math.max(minDistance, Math.min(maxDistance, cameraDistanceRef.current + change));
    };

    try {
      // SCENE & CAMERA
      const scene = new THREE.Scene();
      // Keep scene.background undefined so the WebGL alpha transparency works flawlessly 
      // and reveals the CSS radial-dot matrix container background underneath.
      sceneRef.current = scene;

      // Dynamically calculate proper camera distance based on box size
      const initialDistance = maxDim * 2.8;
      cameraDistanceRef.current = initialDistance;

      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
      camera.position.set(0, maxDim * 0.8, initialDistance);
      cameraRef.current = camera;

      // RENDERER
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // ROTATIONAL PIVOT GROUPS
      const pivot = new THREE.Group();
      pivot.rotation.x = 0.4; // initial attractive angles
      pivot.rotation.y = -0.6;
      scene.add(pivot);
      pivotRef.current = pivot;

      const panelsGroup = new THREE.Group();
      pivot.add(panelsGroup);
      panelsGroupRef.current = panelsGroup;

      // GRID HELPER & FLOOR SHADOW PLANE (Added directly to pivot for unified Fusion rotation)
      const gridHelper = new THREE.GridHelper(maxDim * 5, 24, '#3b82f6', '#cbd5e1');
      gridHelper.position.y = -params.height / 2;
      pivot.add(gridHelper);

      // FLOOR PLANE FOR SHADOWS (Added directly to pivot for unified rotation)
      const shadowGeo = new THREE.PlaneGeometry(maxDim * 8, maxDim * 8);
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0.15 });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -params.height / 2 - 0.1;
      shadowMesh.receiveShadow = true;
      pivot.add(shadowMesh);

      // ORIGIN AXIS ARROWS (Autodesk Fusion style)
      const axesHelper = new THREE.AxesHelper(maxDim * 0.4);
      // Position it at the corner of the box base boundary
      axesHelper.position.set(-params.width / 2 - 15, -params.height / 2, -params.depth / 2 - 15);
      // In THREE, X = Red, Y = Green, Z = Blue. We can customize if desired, but default is standard.
      pivot.add(axesHelper);

      // LIGHTS
      const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight('#ffffff', 0.85);
      dirLight1.position.set(maxDim * 1.5, maxDim * 3, maxDim * 2);
      dirLight1.castShadow = true;
      dirLight1.shadow.mapSize.width = 1024;
      dirLight1.shadow.mapSize.height = 1024;
      dirLight1.shadow.bias = -0.001;
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight('#ffffff', 0.25);
      dirLight2.position.set(-maxDim * 2, maxDim, -maxDim * 2);
      scene.add(dirLight2);

      // Initial box construct
      rebuild3DBox();

      // RENDER LOOP
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        // Smooth camera position update for zoom wheel controls
        if (cameraRef.current) {
          const targetDistance = cameraDistanceRef.current;
          // Dampen camera tracking
          const currentDistance = cameraRef.current.position.length();
          const nextDistance = THREE.MathUtils.lerp(currentDistance, targetDistance, 0.1);

          // Keep correct viewing direction from origin to camera
          const dir = cameraRef.current.position.clone().normalize();
          cameraRef.current.position.copy(dir.multiplyScalar(nextDistance));
          cameraRef.current.lookAt(0, 0, 0);
        }

        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      canvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel, { passive: false });

      // Handle container resize
      const handleResize = () => {
        if (!containerRef.current || !renderer || !cameraRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight || 450;
        renderer.setSize(w, h);
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      };

      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);

      setWebglError(null);
    } catch (e: any) {
      console.warn("WebGL initialization failed:", e);
      setWebglError(e?.message || "WebGL is not supported or was blocked.");
    }

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [params.width, params.height, params.depth, params.thickness, materialColor, materialType, wireframeMode]);

  // Rebuild geometry when panels change
  useEffect(() => {
    rebuild3DBox();
  }, [panels, explode]);

  const handleZoom = (direction: 'in' | 'out') => {
    const maxDim = Math.max(params.width, params.height, params.depth);
    const zoomSpeed = maxDim * 0.6;
    const minDistance = maxDim * 1.1;
    const maxDistance = maxDim * 8.0;

    cameraDistanceRef.current = Math.max(
      minDistance,
      Math.min(maxDistance, cameraDistanceRef.current + (direction === 'in' ? -zoomSpeed : zoomSpeed))
    );
  };

  const handleResetCamera = () => {
    if (pivotRef.current) {
      pivotRef.current.rotation.set(0.4, -0.6, 0);
    }
    const maxDim = Math.max(params.width, params.height, params.depth);
    cameraDistanceRef.current = maxDim * 2.8;
  };

  if (webglError) {
    return (
      <div 
        className="w-full h-full min-h-[450px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center justify-center p-8 text-center" 
        ref={containerRef}
      >
        <div className="max-w-md bg-white border border-slate-200 p-6 rounded-2xl shadow-md flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-500">
            <Rotate3d className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">3D Preview Suspended</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            WebGL context creation was blocked or lost. This occurs when viewing the app within sandboxed iframes or lower-performance environments.
          </p>
          <div className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">Alternative Solutions</span>
            <ul className="text-[11px] text-slate-600 list-disc list-inside flex flex-col gap-1">
              <li>Switch to the <strong className="text-slate-800">2D Flat Sheet Layout</strong> tab to see flat nesting.</li>
              <li>Open the app in a <strong className="text-slate-800">New Tab</strong> to bypass sandbox frame blocks.</li>
              <li>Toggle parameters on the left to dynamically adjust dimensions.</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setWebglError(null);
              // Simple reload or trigger state refresh
              setTimeout(() => rebuild3DBox(), 100);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            Attempt to Re-initialize WebGL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col" 
      ref={containerRef}
    >
      <canvas className="w-full h-full flex-grow cad-cursor-grab outline-none" id="canvas-3d-box" ref={canvasRef} />

      {/* Floating help / controls layer */}
      <div className="absolute top-4 left-4 pointer-events-none bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm">
        <Rotate3d className="w-4 h-4 text-blue-600 animate-pulse" />
        <span className="text-xs font-semibold text-slate-700 select-none">
          Left Click + Drag to Orbit │ Scroll to Zoom
        </span>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-1 bg-white/95 backdrop-blur-sm p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => handleZoom('in')}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Reset Camera View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {showLabels && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5 select-none">
          <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">Active Mesh Parts</span>
          <div className="flex flex-col gap-1">
            {panels.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 border border-blue-400/30" />
                <span className="text-xs font-semibold text-slate-700 capitalize">{p.name || p.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
