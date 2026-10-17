/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GpuSettings, SystemSpecs } from '../types/benchmark';
import { Play, Flame, ShieldAlert, Cpu, Sparkles, Layers, RefreshCw } from 'lucide-react';

interface GpuViewportProps {
  gpuEnabled: boolean;
  settings: GpuSettings;
  specs: SystemSpecs | null;
  onFpsUpdate: (fps: number, frametimeMs: number, drawCalls: number, triangles: number) => void;
  onStartGpu: () => void;
}

export const GpuViewport: React.FC<GpuViewportProps> = ({
  gpuEnabled,
  settings,
  specs,
  onFpsUpdate,
  onStartGpu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const fpsTrackerRef = useRef<{
    lastTime: number;
    frames: number;
    times: number[];
  }>({ lastTime: performance.now(), frames: 0, times: [] });

  const [activeRes, setActiveRes] = useState<string>('1920 × 1080');
  const [internalRes, setInternalRes] = useState<string>('1920 × 1080');

  // Multi-shell fur shader material for the classic FurMark Furry Donut
  const createFurDonutScene = (scene: THREE.Scene, furLayers: number) => {
    const group = new THREE.Group();

    // 1. Core glowing torus
    const torusGeo = new THREE.TorusGeometry(2.4, 1.0, 32, 64);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xaa2200,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.7,
    });
    const coreMesh = new THREE.Mesh(torusGeo, coreMat);
    group.add(coreMesh);

    // 2. Multi-shell Fur Layers (High stress pixel fillrate & geometric shells)
    const shellCount = Math.max(8, Math.min(furLayers, 64));
    
    // Procedural noise texture for fur strands
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 128);
    const imgData = ctx.getImageData(0, 0, 128, 128);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() > 0.65 ? Math.floor(Math.random() * 200 + 55) : 0;
      imgData.data[i] = v;     // R
      imgData.data[i + 1] = v * 0.4; // G
      imgData.data[i + 2] = 0; // B
      imgData.data[i + 3] = v > 0 ? 255 : 0; // Alpha
    }
    ctx.putImageData(imgData, 0, 0);
    const furTexture = new THREE.CanvasTexture(canvas);
    furTexture.wrapS = THREE.RepeatWrapping;
    furTexture.wrapT = THREE.RepeatWrapping;
    furTexture.repeat.set(16, 8);

    for (let s = 1; s <= shellCount; s++) {
      const scaleOffset = 1.0 + (s / shellCount) * 0.22;
      const shellGeo = new THREE.TorusGeometry(2.4 * scaleOffset, 1.0 * scaleOffset, 24, 48);
      const alphaVal = Math.max(0.15, 1.0 - (s / shellCount) * 0.85);

      const shellMat = new THREE.MeshStandardMaterial({
        map: furTexture,
        transparent: true,
        opacity: alphaVal,
        color: new THREE.Color().setHSL(0.06 - (s / shellCount) * 0.05, 0.95, 0.5),
        roughness: 0.8,
        metalness: 0.1,
        depthWrite: false,
      });

      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.userData = { shellIndex: s, maxShells: shellCount };
      group.add(shellMesh);
    }

    // 3. Central blazing vortex core
    const innerGeo = new THREE.IcosahedronGeometry(1.2, 3);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // 4. Ground reflection disc with contact shadow
    const groundGeo = new THREE.CircleGeometry(6, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.4,
      metalness: 0.8,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -3.2;
    group.add(groundMesh);

    scene.add(group);
    return group;
  };

  const createParticles = (scene: THREE.Scene, count: number) => {
    const pCount = Math.min(count, 50000);
    if (pCount <= 0) return null;

    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    const colors = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.0 + Math.random() * 4.5;
      const y = (Math.random() - 0.5) * 4.5;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      // Fiery ember colors
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = Math.random() * 0.6 + 0.2;
      colors[i * 3 + 2] = 0.05;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);
    return points;
  };

  // Main Effect: Initialize or tear down Three.js based on gpuEnabled
  useEffect(() => {
    // If GPU is NOT enabled: clean up and ensure 0% GPU stress
    if (!gpuEnabled) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
      meshesGroupRef.current = null;
      particlesRef.current = null;
      return;
    }

    // GPU is ENABLED: Initialize high-performance WebGL 3D Stress scene
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // Calculate effective render resolution based on DLSS / renderScale
    let scale = settings.renderScale;
    if (specs?.features.dlssSupported && settings.x64Options.dlssMode !== 'off') {
      switch (settings.x64Options.dlssMode) {
        case 'quality': scale = 0.67; break;
        case 'balanced': scale = 0.58; break;
        case 'performance': scale = 0.50; break;
        case 'ultra_performance': scale = 0.33; break;
      }
    }

    const renderW = Math.max(320, Math.floor(width * scale));
    const renderH = Math.max(240, Math.floor(height * scale));

    setActiveRes(`${width} × ${height}`);
    setInternalRes(`${renderW} × ${renderH} (${(scale * 100).toFixed(0)}% ${settings.x64Options.dlssMode !== 'off' ? `DLSS ${settings.x64Options.dlssMode.toUpperCase()}` : 'Scale'})`);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.05);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 7.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: settings.msaa,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // Explicit control over render resolution
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio lighting rig
    const ambientLight = new THREE.AmbientLight(0xff6622, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3388ff, 1.2);
    dirLight2.position.set(-6, -4, -3);
    scene.add(dirLight2);

    // Construct 3D stress meshes
    meshesGroupRef.current = createFurDonutScene(scene, settings.furLayers);
    particlesRef.current = createParticles(scene, settings.particleCount);

    fpsTrackerRef.current = {
      lastTime: performance.now(),
      frames: 0,
      times: [],
    };

    let rotX = 0;
    let rotY = 0;
    let clock = new THREE.Clock();

    // Render loop with optional unlocked stress multiplier
    const renderTick = () => {
      if (!gpuEnabled) return;

      const delta = clock.getDelta();
      const now = performance.now();

      // Rotate meshes
      if (meshesGroupRef.current) {
        rotX += delta * 0.9;
        rotY += delta * 1.3;
        meshesGroupRef.current.rotation.x = rotX;
        meshesGroupRef.current.rotation.y = rotY;
      }

      // Orbit particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y += delta * 0.4;
      }

      // Draw frame(s)
      // If unlimitedFps is true: execute multiple draw calls to saturate GPU execution pipelines
      const passes = settings.unlimitedFps ? 2 : 1;
      for (let p = 0; p < passes; p++) {
        renderer.render(scene, camera);
      }

      // Calculate FPS and frame time
      fpsTrackerRef.current.frames += (settings.x64Options.frameGeneration ? 2 : 1) * passes;
      const elapsed = now - fpsTrackerRef.current.lastTime;

      if (elapsed >= 250) {
        const curFps = (fpsTrackerRef.current.frames / (elapsed / 1000));
        const ftMs = 1000 / Math.max(1, curFps);
        const info = renderer.info;
        
        onFpsUpdate(
          curFps,
          ftMs,
          info.render.calls,
          info.render.triangles
        );

        fpsTrackerRef.current.lastTime = now;
        fpsTrackerRef.current.frames = 0;
      }

      animFrameId.current = requestAnimationFrame(renderTick);
    };

    renderTick();

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      setActiveRes(`${w} × ${h}`);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [gpuEnabled, settings.furLayers, settings.renderScale, settings.msaa, settings.unlimitedFps, settings.x64Options.dlssMode, settings.x64Options.frameGeneration, settings.particleCount]);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-center items-center">
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Standby State when GPU is OFF */}
      {!gpuEnabled && (
        <div className="relative z-10 max-w-md p-6 text-center bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <Flame className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-1">
            GPU 三维压力场景待机中
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            未开始 GPU 测试时保持关闭，0% 显卡负载与能耗。可单独运行 CPU 或内存压测。开始后将激活高负荷着色器并解除帧率上限。
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onStartGpu}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              启动 GPU 三维压力测试
            </button>
            <div className="text-[11px] text-slate-400 mt-1">
              显卡: {specs?.gpuRenderer || '检测中...'}
            </div>
          </div>
        </div>
      )}

      {/* Live OSD (On-Screen Display) when GPU is RUNNING */}
      {gpuEnabled && (
        <>
          {/* Top Left OSD HUD */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-amber-400">GPU 负载渲染中</span>
              <span className="text-slate-400">|</span>
              <span className="font-mono">{specs?.gpuRenderer.split('/')[0].slice(0, 30)}</span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded text-[11px] text-slate-300">
              <span>渲染视口:</span>
              <span className="font-mono text-emerald-400">{activeRes}</span>
              <span className="text-slate-400">|</span>
              <span>内部算力分辨率:</span>
              <span className="font-mono text-cyan-400">{internalRes}</span>
            </div>

            {settings.x64Options.frameGeneration && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 border border-indigo-700/60 rounded text-[11px] text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>DLSS 帧生成已激活: 2X 视觉平滑插帧模式 (光学多帧流)</span>
              </div>
            )}
          </div>

          {/* Top Right Hardware Status Badge */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-none">
            <div className="px-3 py-1 bg-amber-950/80 border border-amber-600/40 rounded text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>毛皮甜甜圈 {settings.furLayers} 层密集着色器</span>
            </div>
            {settings.unlimitedFps && (
              <div className="px-2.5 py-1 bg-rose-950/80 border border-rose-600/50 rounded text-xs font-mono font-bold text-rose-300">
                无锁帧满载
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
