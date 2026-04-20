"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ScrollFramesProps {
  frameCount: number;
  framePath: string;
  className?: string;
}

export function ScrollFrames({ frameCount, framePath, className }: ScrollFramesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const rafRef = useRef<number>();

  // Preload all frames into memory
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new window.Image();
      const frameNum = String(i).padStart(4, "0");
      img.src = `${framePath}${frameNum}.jpg`;
      
      img.onload = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / frameCount) * 100));
        if (loaded === frameCount) {
          imagesRef.current = images;
          setLoading(false);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === frameCount) {
          imagesRef.current = images;
          setLoading(false);
        }
      };
      
      images.push(img);
    }
  }, [frameCount, framePath]);

  // Smooth animation loop with lerp
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const images = imagesRef.current;
    if (!canvas || images.length === 0) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Lerp for smooth transition (0.15 = responsive but smooth)
    const current = currentFrameRef.current;
    const target = targetFrameRef.current;
    const diff = target - current;
    
    if (Math.abs(diff) > 0.5) {
      currentFrameRef.current += diff * 0.15;
    } else {
      currentFrameRef.current = target;
    }

    const frameIndex = Math.round(currentFrameRef.current);
    const img = images[Math.min(Math.max(frameIndex, 0), images.length - 1)];

    if (img && img.complete && img.naturalWidth > 0) {
      // Resize canvas to match container
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      // Draw image covering canvas (object-cover behavior)
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Start animation loop
  useEffect(() => {
    if (!loading) {
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, animate]);

  // Scroll handler — updates target frame
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(Math.max(scrollTop / scrollHeight, 0), 1) : 0;
      
      targetFrameRef.current = progress * (frameCount - 1);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [frameCount]);

  return (
    <div className={className}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gold text-sm">Cargando... {loadProgress}%</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${loading ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}
