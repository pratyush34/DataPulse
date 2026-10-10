import { useEffect, useRef } from 'react';

export default function GlobeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Globe configuration
    const DOTS_COUNT = 720;
    const RADIUS_RATIO = 0.38; // relative to min dimension
    let radius = 220;

    // Rotation angles and velocities
    let rotX = 0.35;
    let rotY = 0;
    let targetRotY = 0;
    let targetRotX = 0.35;
    let autoSpeed = 0.0035;

    // Mouse interaction
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Generate 3D sphere points (Fibonacci Sphere algorithm for uniform distribution)
    const points = [];
    const phi = Math.PI * (Math.sqrt(5) - 1); // golden ratio angle

    for (let i = 0; i < DOTS_COUNT; i++) {
      const y = 1 - (i / (DOTS_COUNT - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Special highlighted cluster nodes (data centers / global hubs)
      const isHub = i % 18 === 0;

      points.push({
        x,
        y,
        z,
        baseSize: isHub ? 2.8 : 1.25,
        isHub,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Great circle arcs / satellites
    const satellites = Array.from({ length: 4 }, (_, index) => ({
      angle: (index * Math.PI) / 2,
      speed: 0.012 + index * 0.004,
      tilt: 0.4 + index * 0.25,
      radiusOffset: 1.15 + (index % 2) * 0.1,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      radius = Math.min(width, height) * RADIUS_RATIO;
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse & touch handlers for interactive rotation
    const handleMouseDown = (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!isDragging) {
        // Subtle magnetic tilt on hover
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        targetRotX = 0.35 + ny * 0.2;
        return;
      }
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      targetRotY += dx * 0.006;
      targetRotX += dy * 0.006;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseX;
      const dy = e.touches[0].clientY - lastMouseY;
      targetRotY += dx * 0.008;
      targetRotX += dy * 0.008;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    let time = 0;

    // Render loop
    const render = () => {
      time += 0.02;
      targetRotY += autoSpeed;
      // Smooth interpolation (damping)
      rotY += (targetRotY - rotY) * 0.08;
      rotX += (targetRotX - rotX) * 0.08;
      rotX = Math.max(-0.9, Math.min(0.9, rotX)); // clamp pitch

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw atmospheric outer ambient glow
      const ambientGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.5,
        centerX,
        centerY,
        radius * 1.55
      );
      ambientGlow.addColorStop(0, 'rgba(37, 99, 235, 0.18)');
      ambientGlow.addColorStop(0.5, 'rgba(29, 78, 216, 0.09)');
      ambientGlow.addColorStop(0.85, 'rgba(59, 130, 246, 0.02)');
      ambientGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');

      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw wireframe latitude & longitude contour rings
      ctx.save();
      const ringCount = 5;
      for (let r = 0; r < ringCount; r++) {
        const ringZ = ((r - 2) / 3) * 0.85;
        const ringRadius = Math.sqrt(Math.max(0, 1 - ringZ * ringZ)) * radius;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.07)';
        ctx.lineWidth = 1;
        ctx.ellipse(
          centerX,
          centerY + ringZ * radius * Math.cos(rotX),
          ringRadius,
          ringRadius * Math.sin(rotX + 0.3),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      ctx.restore();

      // Cosine and Sine of rotation angles
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project points
      const projected = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Rotate around Y
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate around X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Depth perspective (FOV factor)
        const perspective = 2.4 / (2.4 + z2);
        const px = centerX + x1 * radius * perspective;
        const py = centerY + y2 * radius * perspective;

        projected.push({
          x: px,
          y: py,
          z: z2,
          isHub: p.isHub,
          baseSize: p.baseSize,
          pulseOffset: p.pulseOffset,
        });
      }

      // Sort points from back to front for proper depth blending
      projected.sort((a, b) => a.z - b.z);

      // 3. Connect nearby high-priority hub nodes with glowing energy lines
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (!p1.isHub || p1.z < -0.2) continue;

        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (!p2.isHub || p2.z < -0.2) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < (radius * 0.45) ** 2) {
            const alpha = Math.max(
              0,
              (1 - Math.sqrt(distSq) / (radius * 0.45)) * 0.35 * (p1.z + 1.2) * 0.5
            );
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 4. Render particles / globe dots
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        // Normalize depth z: -1 (back) to +1 (front)
        const depthAlpha = (p.z + 1) / 2; // 0 to 1
        const backDim = p.z < 0 ? 0.25 : 1;
        const alpha = Math.max(0.08, depthAlpha * 0.85 * backDim);

        let size = p.baseSize * (0.6 + depthAlpha * 0.8);
        if (p.isHub) {
          const pulse = (Math.sin(time * 3 + p.pulseOffset) + 1) * 0.5;
          size += pulse * 1.5;

          // Extra halo around hubs facing front
          if (p.z > 0.1) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(37, 99, 235, ${(alpha * 0.35).toFixed(3)})`;
            ctx.fill();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);

        if (p.isHub && p.z > 0) {
          ctx.fillStyle = `rgba(224, 242, 254, ${alpha.toFixed(3)})`; // vibrant crisp center
        } else if (p.z > 0.3) {
          ctx.fillStyle = `rgba(96, 165, 250, ${alpha.toFixed(3)})`; // royal/sky blue
        } else {
          ctx.fillStyle = `rgba(37, 99, 235, ${alpha.toFixed(3)})`; // deep royal blue
        }
        ctx.fill();
      }

      // 5. Render orbiting satellites with trajectory rings
      for (let i = 0; i < satellites.length; i++) {
        const sat = satellites[i];
        sat.angle += sat.speed;
        const satRadius = radius * sat.radiusOffset;

        const sx0 = Math.cos(sat.angle) * satRadius;
        const sy0 = Math.sin(sat.angle) * satRadius * Math.sin(sat.tilt);
        const sz0 = Math.sin(sat.angle) * satRadius * Math.cos(sat.tilt);

        // Rotate satellite with globe rotation
        const sx1 = sx0 * cosY + sz0 * sinY;
        const sz1 = -sx0 * sinY + sz0 * cosY;
        const sy2 = sy0 * cosX - sz1 * sinX;
        const sz2 = sy0 * sinX + sz1 * cosX;

        const persp = 2.4 / (2.4 + sz2 / radius);
        const spx = centerX + sx1 * persp;
        const spy = centerY + sy2 * persp;

        // Only draw if facing front-ish or with lower alpha in back
        const satAlpha = (sz2 / radius + 1) / 2;
        if (satAlpha > 0.2) {
          // Satellite beacon
          ctx.beginPath();
          ctx.arc(spx, spy, 3.5 * persp, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, satAlpha * 1.3).toFixed(2)})`;
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Pulse ring around satellite
          ctx.beginPath();
          ctx.arc(spx, spy, 7 * persp, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${(satAlpha * 0.6).toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing select-none overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute w-[600px] h-[600px] md:w-[850px] md:h-[850px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none -z-10 animate-pulse duration-1000" />
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[1200px] max-h-[900px] object-contain"
        aria-label="Interactive 3D particle wireframe globe representing DataPulse dataset geometry and feature space"
      />
      {/* Interactive Drag Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-500/20 text-[11px] text-blue-300/80 backdrop-blur-md pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        Interactive 3D Network • Drag to Rotate
      </div>
    </div>
  );
}
