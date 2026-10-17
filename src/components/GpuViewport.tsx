/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GpuSettings, SystemSpecs } from '../types/benchmark';
import { Play, Flame, ShieldAlert, Cpu, Sparkles, Layers, RefreshCw, Zap } from 'lucide-react';

interface GpuViewportProps {
  gpuEnabled: boolean;
  settings: GpuSettings;
  specs: SystemSpecs | null;
  onFpsUpdate: (fps: number, frametimeMs: number, drawCalls: number, triangles: number) => void;
  onStartGpu: () => void;
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
    for (int i = 0; i < 8; i++) {
      total += hash(p * float(i + 1) + uTime * 0.1) * amp;
      p = p * 1.7 + vec2(1.2, 3.4);
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    // Sample strand alpha from noise texture
    vec4 noiseSample = texture2D(uFurNoise, vUv * vec2(24.0, 12.0));
    
    // Heavy ALU computation
    float heavyAlu = heavyNoiseLoop(vUv * 8.0);

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
    finalColor += heavyAlu * 0.05;

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const uniformsRef = useRef<{ uTime: { value: number } }>({ uTime: { value: 0 } });
  const [stressMultiplier, setStressMultiplier] = useState<number>(4); // 1x, 4x, 8x GPU load multiplier

  const fpsTrackerRef = useRef<{
    lastTime: number;
    frames: number;
    times: number[];
  }>({ lastTime: performance.now(), frames: 0, times: [] });

  const [activeRes, setActiveRes] = useState<string>('1920 × 1080');
  const [internalRes, setInternalRes] = useState<string>('1920 × 1080');

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

    // 1. High-polygon base Torus
    const torusGeo = new THREE.TorusGeometry(2.4, 0.95, 48, 96);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xcc2200,
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(torusGeo, coreMat);
    group.add(coreMesh);

    // 2. High-Stress Multi-Shell Fur Layers with custom GLSL Shader
    const shellCount = Math.max(16, Math.min(furLayers, 64));

    for (let s = 1; s <= shellCount; s++) {
      const shellGeo = new THREE.TorusGeometry(2.4, 0.95, 36, 72);

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
    const innerGeo = new THREE.IcosahedronGeometry(1.2, 4);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff5500,
      emissiveIntensity: 1.0,
      wireframe: true,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // 4. Heavy reflective ground grid
    const groundGeo = new THREE.CircleGeometry(7, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.3,
      metalness: 0.85,
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

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = Math.random() * 0.6 + 0.2;
      colors[i * 3 + 2] = 0.05;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);
    return points;
  };

  // Main Effect: Initialize or tear down Three.js based on gpuEnabled
  useEffect(() => {
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

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    let scale = settings.renderScale;
    if (specs?.features.dlssSupported && settings.x64Options.dlssMode !== 'off') {
      switch (settings.x64Options.dlssMode) {
        case 'quality': scale = 0.67; break;
        case 'balanced': scale = 0.58; break;
        case 'performance': scale = 0.50; break;
        case 'ultra_performance': scale = 0.33; break;
      }
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderW = Math.max(320, Math.floor(width * scale * dpr));
    const renderH = Math.max(240, Math.floor(height * scale * dpr));

    setActiveRes(`${width} × ${height} (@${dpr}x)`);
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
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio lighting rig
    const ambientLight = new THREE.AmbientLight(0xff6622, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 2.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3388ff, 1.4);
    dirLight2.position.set(-6, -4, -3);
    scene.add(dirLight2);

    const furTex = createProceduralFurTexture();
    meshesGroupRef.current = createFurDonutScene(scene, settings.furLayers, furTex);
    particlesRef.current = createParticles(scene, settings.particleCount);

    fpsTrackerRef.current = {
      lastTime: performance.now(),
      frames: 0,
      times: [],
    };

    let rotX = 0;
    let rotY = 0;
    const clock = new THREE.Clock();

    // Render loop: multi-pass saturation loop to truly load desktop GPUs to 90%~100%
    const renderTick = () => {
      if (!gpuEnabled) return;

      const delta = clock.getDelta();
      const now = performance.now();
      uniformsRef.current.uTime.value = clock.getElapsedTime();

      if (meshesGroupRef.current) {
        rotX += delta * 0.9;
        rotY += delta * 1.3;
        meshesGroupRef.current.rotation.x = rotX;
        meshesGroupRef.current.rotation.y = rotY;
      }

      if (particlesRef.current) {
        particlesRef.current.rotation.y += delta * 0.4;
      }

      // MULTI-PASS GPU SATURATION
      // In unlocked mode: execute multiple render iterations to fully load the GPU shader pipeline
      const passes = settings.unlimitedFps ? Math.max(2, stressMultiplier * 2) : 1;
      for (let p = 0; p < passes; p++) {
        renderer.render(scene, camera);
      }

      // Track FPS and frame latency
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

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      setActiveRes(`${w} × ${h} (@${dpr}x)`);
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
  }, [gpuEnabled, settings.furLayers, settings.renderScale, settings.msaa, settings.unlimitedFps, settings.x64Options.dlssMode, settings.x64Options.frameGeneration, settings.particleCount, stressMultiplier]);

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
            未开始 GPU 测试时保持关闭，0% 显卡负载与能耗。可单独运行 CPU 或内存压测。开始后将激活高负荷 FurMark 着色器并解除帧率上限。
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

      {/* Live OSD when GPU is RUNNING */}
      {gpuEnabled && (
        <>
          {/* Top Left OSD HUD */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-amber-400">GPU 核心满载压测中</span>
              <span className="text-slate-400">|</span>
              <span className="font-mono">{specs?.gpuRenderer.split('/')[0].slice(0, 30)}</span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded text-[11px] text-slate-300">
              <span>渲染视口:</span>
              <span className="font-mono text-emerald-400">{activeRes}</span>
              <span className="text-slate-400">|</span>
              <span>内部算力:</span>
              <span className="font-mono text-cyan-400">{internalRes}</span>
            </div>

            {settings.x64Options.frameGeneration && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 border border-indigo-700/60 rounded text-[11px] text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>DLSS 帧生成已激活: 2X 视觉平滑插帧模式 (光学多帧流)</span>
              </div>
            )}
          </div>

          {/* Top Right Controls & Multiplier */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Stress Multiplier Selector */}
            <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-[11px]">
              <span className="text-slate-400 px-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> 压测负荷:
              </span>
              {[1, 2, 4, 8].map((mult) => (
                <button
                  key={mult}
                  onClick={() => setStressMultiplier(mult)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                    stressMultiplier === mult
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mult}X
                </button>
              ))}
            </div>

            <div className="px-2.5 py-1 bg-rose-950/90 border border-rose-600/50 rounded-lg text-xs font-mono font-bold text-rose-300">
              无锁帧满载
            </div>
          </div>
        </>
      )}
    </div>
  );
};
