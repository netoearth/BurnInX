/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GpuSettings, SystemSpecs } from '../types/benchmark';
import {
  Play,
  Flame,
  Sparkles,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface GpuViewportProps {
  gpuEnabled: boolean;
  settings: GpuSettings;
  specs: SystemSpecs | null;
  onFpsUpdate: (fps: number, frametimeMs: number, drawCalls: number, triangles: number) => void;
  onStartGpu: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

// Heavy Procedural Simplex Noise & Fur Combustion Shader
// Designed to saturate GPU shader cores & pixel fillrate similar to FurMark
const furVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform float uShellIndex;
  uniform float uTotalShells;
  uniform float uTime;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Dynamic fur displacement along vertex normal with wave turbulence
    float displacement = (uShellIndex / uTotalShells) * 0.35;
    vec3 displacedPos = position + normal * displacement;
    
    // Wind swirl offset
    float wind = sin(uTime * 3.0 + position.y * 2.0) * 0.05 * (uShellIndex / uTotalShells);
    displacedPos.x += wind;
    displacedPos.z += wind * 0.5;

    vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const furFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform float uShellIndex;
  uniform float uTotalShells;
  uniform float uTime;
  uniform sampler2D uFurNoise;

  // Heavy fractional Brownian motion hash loop to saturate GPU compute
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float heavyNoiseLoop(vec2 p) {
    float total = 0.0;
    float amp = 1.0;
    for (int i = 0; i < 6; i++) {
      total += hash(p * float(i + 1) + uTime * 0.1) * amp;
      p = p * 1.7 + vec2(1.2, 3.4);
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    // Sample strand alpha from noise texture
    vec4 noiseSample = texture2D(uFurNoise, vUv * vec2(20.0, 10.0));
    
    // Controlled ALU computation to prevent driver TDR
    float heavyAlu = heavyNoiseLoop(vUv * 6.0);

    float layerRatio = uShellIndex / uTotalShells;
    float strandCutoff = layerRatio * 0.85;

    if (noiseSample.r < strandCutoff && uShellIndex > 0.0) {
      discard;
    }

    // Volumetric flame gradient: core is white-hot, fading into orange and smoky crimson
    vec3 coreColor = vec3(1.0, 0.9, 0.4);
    vec3 midColor = vec3(1.0, 0.35, 0.02);
    vec3 tipColor = vec3(0.5, 0.05, 0.01);

    vec3 finalColor = mix(coreColor, midColor, smoothstep(0.0, 0.6, layerRatio));
    finalColor = mix(finalColor, tipColor, smoothstep(0.6, 1.0, layerRatio));

    // Specular highlight & rim glow
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    finalColor += vec3(1.0, 0.6, 0.1) * pow(rim, 3.0) * 0.8;
    finalColor += heavyAlu * 0.04;

    float alpha = max(0.25, 1.0 - layerRatio * 0.75);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const GpuViewport: React.FC<GpuViewportProps> = ({
  gpuEnabled,
  settings,
  specs,
  onFpsUpdate,
  onStartGpu,
  isMaximized: controlledMaximized,
  onToggleMaximize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const uniformsRef = useRef<{ uTime: { value: number } }>({ uTime: { value: 0 } });
  const [stressMultiplier, setStressMultiplier] = useState<number>(2); // 1x, 2x, 4x GPU load multiplier

  // Internal maximize state if not controlled
  const [internalMaximized, setInternalMaximized] = useState<boolean>(false);
  const effectiveMaximized = controlledMaximized !== undefined ? controlledMaximized : internalMaximized;

  const toggleMaximize = useCallback(() => {
    if (onToggleMaximize) {
      onToggleMaximize();
    } else {
      setInternalMaximized((prev) => !prev);
    }
  }, [onToggleMaximize]);

  // Fullscreen API toggle
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Listen to Escape key to exit maximization
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && effectiveMaximized) {
        toggleMaximize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveMaximized, toggleMaximize]);

  // Lock body scroll when maximized
  useEffect(() => {
    if (effectiveMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [effectiveMaximized]);

  const fpsTrackerRef = useRef<{
    lastTime: number;
    frames: number;
    times: number[];
  }>({ lastTime: performance.now(), frames: 0, times: [] });

  const [activeRes, setActiveRes] = useState<string>('1920 × 1080');
  const [internalRes, setInternalRes] = useState<string>('1920 × 1080');
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveFrametime, setLiveFrametime] = useState<number>(0);

  // Procedural noise texture generator for fur strands
  const createProceduralFurTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    const imgData = ctx.getImageData(0, 0, 256, 256);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() > 0.6 ? Math.floor(Math.random() * 210 + 45) : 0;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = v > 0 ? 255 : 0;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 8);
    return texture;
  };

  // Build high-stress FurMark Donut with custom GLSL shaders
  const createFurDonutScene = (scene: THREE.Scene, furLayers: number, furTexture: THREE.Texture) => {
    const group = new THREE.Group();

    // 1. Base Torus
    const torusGeo = new THREE.TorusGeometry(2.4, 0.95, 40, 80);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xcc2200,
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(torusGeo, coreMat);
    group.add(coreMesh);

    // 2. Multi-Shell Fur Layers with custom GLSL Shader
    const shellCount = Math.max(16, Math.min(furLayers, 48));

    for (let s = 1; s <= shellCount; s++) {
      const shellGeo = new THREE.TorusGeometry(2.4, 0.95, 32, 64);

      const shellMat = new THREE.ShaderMaterial({
        vertexShader: furVertexShader,
        fragmentShader: furFragmentShader,
        uniforms: {
          uShellIndex: { value: s },
          uTotalShells: { value: shellCount },
          uTime: uniformsRef.current.uTime,
          uFurNoise: { value: furTexture },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      group.add(shellMesh);
    }

    // 3. Central pulsating vortex core
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 3);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
    });
    const innerMesh = new THREE.Mesh(coreGeo, innerCoreMat);
    group.add(innerMesh);

    scene.add(group);
    meshesGroupRef.current = group;

    // 4. Volumetric Ember & Particle Storm
    const pCount = Math.min(settings.particleCount || 10000, 15000);
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const r = 3.5 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pPos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      pPos[i * 3 + 1] = r * Math.sin(phi);
      pPos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);

      pColors[i * 3] = 1.0;
      pColors[i * 3 + 1] = 0.3 + Math.random() * 0.5;
      pColors[i * 3 + 2] = 0.05;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    particlesRef.current = particles;
  };

  // Resize function
  const updateRendererSize = useCallback(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!container || !renderer || !camera) return;

    const w = effectiveMaximized ? window.innerWidth : (container.clientWidth || 800);
    const h = effectiveMaximized ? window.innerHeight : (container.clientHeight || 420);
    const dpr = Math.min(window.devicePixelRatio || 1, effectiveMaximized ? 1.5 : 2) * (settings.renderScale || 1.0);

    camera.aspect = Math.max(0.1, w / Math.max(1, h));
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    setActiveRes(`${Math.round(w)} × ${Math.round(h)} (@${dpr.toFixed(1)}x)`);

    if (settings.x64Options.dlssMode !== 'off') {
      const scaleMap = {
        quality: 0.67,
        balanced: 0.58,
        performance: 0.50,
        ultra_performance: 0.33,
      };
      const scale = scaleMap[settings.x64Options.dlssMode] || 0.67;
      setInternalRes(`${Math.round(w * scale)} × ${Math.round(h * scale)}`);
    } else {
      setInternalRes(`${Math.round(w)} × ${Math.round(h)}`);
    }
  }, [effectiveMaximized, settings.renderScale, settings.x64Options.dlssMode]);

  // Trigger resize on effectiveMaximized change
  useEffect(() => {
    updateRendererSize();
    const t1 = setTimeout(updateRendererSize, 50);
    const t2 = setTimeout(updateRendererSize, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [effectiveMaximized, updateRendererSize]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Strict requirement: Turn OFF 3D scene when GPU stress is not running
    if (!gpuEnabled) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      return;
    }

    // 1. Initialize Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    sceneRef.current = scene;

    // 2. Camera Setup
    const w = effectiveMaximized ? window.innerWidth : (container.clientWidth || 800);
    const h = effectiveMaximized ? window.innerHeight : (container.clientHeight || 420);
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 6.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with Unlocked VSync & Context Loss Handling
    const dpr = Math.min(window.devicePixelRatio || 1, effectiveMaximized ? 1.5 : 2) * (settings.renderScale || 1.0);
    const renderer = new THREE.WebGLRenderer({
      antialias: settings.msaa,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    const glCanvas = renderer.domElement;
    glCanvas.className = 'w-full h-full block';

    // Handle WebGL Context Lost to prevent permanent freeze
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('BurnInX GPU: WebGL Context Lost detected, pausing loop...');
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };

    const handleContextRestored = () => {
      console.log('BurnInX GPU: WebGL Context Restored, restarting loop...');
    };

    glCanvas.addEventListener('webglcontextlost', handleContextLost, false);
    glCanvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    container.appendChild(glCanvas);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff8833, 2.5);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const pointLight = new THREE.PointLight(0xff2200, 4.0, 15);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 5. Construct Fur Donut
    const furTexture = createProceduralFurTexture();
    createFurDonutScene(scene, settings.furLayers, furTexture);

    // 6. Animation and Unlocked FPS Stress Loop
    let clock = new THREE.Clock();
    fpsTrackerRef.current.lastTime = performance.now();
    fpsTrackerRef.current.frames = 0;

    const renderTick = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      const elapsedTotal = clock.getElapsedTime();
      const now = performance.now();

      uniformsRef.current.uTime.value = elapsedTotal;

      if (meshesGroupRef.current) {
        meshesGroupRef.current.rotation.x = elapsedTotal * 0.45;
        meshesGroupRef.current.rotation.y = elapsedTotal * 0.75;
      }

      if (particlesRef.current) {
        particlesRef.current.rotation.y = -elapsedTotal * 0.25;
      }

      // Safe passes count: In maximized mode, limit to 2 passes per frame to avoid GPU driver timeout
      const maxPasses = effectiveMaximized ? Math.min(stressMultiplier, 2) : stressMultiplier;
      const passes = settings.unlimitedFps ? maxPasses : 1;

      for (let p = 0; p < passes; p++) {
        renderer.render(scene, camera);
      }

      // Track FPS and frame latency
      fpsTrackerRef.current.frames += (settings.x64Options.frameGeneration ? 2 : 1) * passes;
      const elapsed = now - fpsTrackerRef.current.lastTime;

      if (elapsed >= 250) {
        const curFps = fpsTrackerRef.current.frames / (elapsed / 1000);
        const ftMs = 1000 / Math.max(1, curFps);
        const info = renderer.info;

        setLiveFps(curFps);
        setLiveFrametime(ftMs);

        onFpsUpdate(curFps, ftMs, info.render.calls, info.render.triangles);

        fpsTrackerRef.current.lastTime = now;
        fpsTrackerRef.current.frames = 0;
      }

      animFrameId.current = requestAnimationFrame(renderTick);
    };

    renderTick();

    const handleWindowResize = () => {
      updateRendererSize();
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      glCanvas.removeEventListener('webglcontextlost', handleContextLost);
      glCanvas.removeEventListener('webglcontextrestored', handleContextRestored);

      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      if (renderer) {
        renderer.dispose();
      }
      if (container.contains(glCanvas)) {
        container.removeChild(glCanvas);
      }
    };
  }, [
    gpuEnabled,
    settings.furLayers,
    settings.renderScale,
    settings.msaa,
    settings.unlimitedFps,
    settings.x64Options.dlssMode,
    settings.x64Options.frameGeneration,
    settings.particleCount,
    stressMultiplier,
    effectiveMaximized,
    onFpsUpdate,
    updateRendererSize,
  ]);

  return (
    <div
      className={`bg-slate-950 overflow-hidden flex flex-col justify-center items-center ${
        effectiveMaximized
          ? 'fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 rounded-none border-none shadow-none'
          : 'relative w-full h-full min-h-[380px] rounded-lg border border-slate-800 shadow-2xl'
      }`}
    >
      {/* 3D Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Standby State when GPU is OFF */}
      {!gpuEnabled && (
        <div className="relative z-10 max-w-md p-6 text-center bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <Flame className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-1">
            GPU 三维压力场景待机中
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            未开始 GPU 测试时保持关闭，0% 显卡负载与能耗。开始后将激活高负荷 FurMark 甜甜圈着色器并解除帧率上限。
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onStartGpu}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              启动 GPU 三维压力测试
            </button>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={toggleMaximize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                {effectiveMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    还原窗口
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    全屏最大化视口
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              显卡: {specs?.gpuModelClean || specs?.gpuRenderer || '检测中...'}
            </div>
          </div>
        </div>
      )}

      {/* Floating Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left OSD HUD */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {gpuEnabled && (
            <>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded text-xs text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono font-bold text-amber-400">
                  GPU 核心压测中
                  {effectiveMaximized ? ' [已全屏最大化]' : ''}
                </span>
                <span className="text-slate-500">|</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {liveFps.toFixed(0)} FPS ({liveFrametime.toFixed(1)} ms)
                </span>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded text-[11px] text-slate-300">
                <span>视口:</span>
                <span className="font-mono text-emerald-400">{activeRes}</span>
                <span className="text-slate-500">|</span>
                <span>内部:</span>
                <span className="font-mono text-cyan-400">{internalRes}</span>
                <span className="text-slate-500">|</span>
                <span className="font-mono text-slate-400 truncate max-w-[200px]" title={specs?.gpuModelClean || specs?.gpuRenderer}>
                  {specs?.gpuModelClean || specs?.gpuRenderer}
                </span>
              </div>

              {settings.x64Options.frameGeneration && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/90 backdrop-blur-md border border-indigo-700/60 rounded text-[11px] text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>DLSS 帧生成已激活: 2X 视觉平滑插帧模式</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right OSD Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {gpuEnabled && (
            <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-[11px]">
              <span className="text-slate-400 px-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> 压测负荷:
              </span>
              {[1, 2, 4].map((mult) => (
                <button
                  key={mult}
                  onClick={() => setStressMultiplier(mult)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                    stressMultiplier === mult
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${mult}X 负荷多重渲染`}
                >
                  {mult}X
                </button>
              ))}
            </div>
          )}

          {/* Browser Fullscreen API Toggle */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
            title={isFullscreen ? '退出全屏' : '原生网页全屏'}
          >
            {isFullscreen ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>

          {/* Maximize / Restore Toggle Button */}
          <button
            onClick={toggleMaximize}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg ${
              effectiveMaximized
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 border border-amber-400/50'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700'
            }`}
            title={effectiveMaximized ? '还原窗口大小 (快捷键: Esc)' : '最大化三维视口窗口'}
          >
            {effectiveMaximized ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>退出最大化 (Esc)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>最大化视口</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Floating Bar in Maximized Mode */}
      {effectiveMaximized && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-5 py-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-full text-xs text-slate-300 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-semibold">FurMark 甜甜圈高压渲染中</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="font-mono text-emerald-400 font-bold text-sm">
            {liveFps.toFixed(0)} FPS
          </div>
          <span className="text-slate-600">|</span>
          <div className="font-mono text-blue-400">
            {liveFrametime.toFixed(1)} ms
          </div>
          <span className="text-slate-600">|</span>
          <button
            onClick={toggleMaximize}
            className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full font-bold cursor-pointer transition-all"
          >
            <Minimize2 className="w-3 h-3" />
            <span>按 ESC 键或点击退出全屏</span>
          </button>
        </div>
      )}
    </div>
  );
};
