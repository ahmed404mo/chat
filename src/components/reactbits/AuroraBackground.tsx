"use client";

import { useEffect, useRef } from "react";

interface AuroraBackgroundProps {
  color?: string;
  speed?: number;
  className?: string;
}

export default function AuroraBackground({
  color = "#7C5CFF",
  speed = 0.3,
  className = "",
}: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      time += speed * 0.005;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const gradient = ctx.createRadialGradient(
        w / 2 + Math.sin(time * 0.3) * w * 0.2,
        h / 2 + Math.cos(time * 0.4) * h * 0.15,
        0,
        w / 2,
        h / 2,
        w * 0.7,
      );

      gradient.addColorStop(0, `${color}20`);
      gradient.addColorStop(0.3, `${color}10`);
      gradient.addColorStop(0.6, `${color}08`);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const gradient2 = ctx.createRadialGradient(
        w * 0.3 + Math.sin(time * 0.5 + 1) * w * 0.15,
        h * 0.6 + Math.cos(time * 0.35 + 2) * h * 0.1,
        0,
        w * 0.3,
        h * 0.6,
        w * 0.5,
      );

      gradient2.addColorStop(0, "#6EE7F910");
      gradient2.addColorStop(0.5, "#8B5CF608");
      gradient2.addColorStop(1, "transparent");

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, w, h);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
