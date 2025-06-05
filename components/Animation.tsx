import { RefObject, useEffect, useRef } from 'react';

export default function Animation({rmsRef}:{rmsRef:RefObject<number>}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const update = () => {
        animationIdRef.current = requestAnimationFrame(update);
        if (ctx) {
            const val = Math.floor(rmsRef.current * 255);
            ctx.fillStyle = `rgb(${val},${val},${val})`;
            ctx.fillRect(0,0,canvas.width,canvas.height);
        }
    }

    update();

    return () => {if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)}
  }, [canvasRef]);

  return <canvas className="w-[500px] h-[500px]" ref={canvasRef}></canvas>;
}
