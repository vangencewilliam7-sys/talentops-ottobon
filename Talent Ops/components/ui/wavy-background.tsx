"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
    children,
    className,
    containerClassName,
    colors,
    waveWidth,
    backgroundFill,
    blur = 10,
    speed = "fast",
    waveOpacity = 0.5,
    ...props
}: {
    children?: any;
    className?: string;
    containerClassName?: string;
    colors?: string[];
    waveWidth?: number;
    backgroundFill?: string;
    blur?: number;
    speed?: "slow" | "fast";
    waveOpacity?: number;
    [key: string]: any;
}) => {
    const noise = useMemo(() => createNoise3D(), []);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const ntRef = useRef(0);
    const sizeRef = useRef({ w: 0, h: 0 });
    const lastTimeRef = useRef(0); // Track last frame time

    const getSpeed = () => {
        switch (speed) {
            case "slow":
                return 0.001;
            case "fast":
                return 0.005;
            default:
                return 0.002;
        }
    };

    const waveColors = colors ?? [
        "#38bdf8",
        "#818cf8",
        "#c084fc",
        "#e879f9",
        "#22d3ee",
    ];

    const drawWave = (ctx: CanvasRenderingContext2D, n: number) => {
        const { w, h } = sizeRef.current;
        ntRef.current += getSpeed();
        for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.lineWidth = waveWidth || 60;
            ctx.strokeStyle = waveColors[i % waveColors.length];
            for (let x = 0; x < w; x += 32) {
                var y = noise(x / 600, 0.3 * i, ntRef.current) * 120;
                ctx.lineTo(x, y + h * 0.5);
            }
            ctx.stroke();
            ctx.closePath();
        }
    };

    const render = (time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Throttle to 30fps (approx 33ms per frame)
        if (time - lastTimeRef.current < 30) {
            requestRef.current = requestAnimationFrame(render);
            return;
        }
        lastTimeRef.current = time;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { w, h } = sizeRef.current;
        ctx.fillStyle = backgroundFill || "black";
        ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = waveOpacity || 0.5;
        drawWave(ctx, 3);
        requestRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        sizeRef.current = {
            w: canvas.width = window.innerWidth,
            h: canvas.height = window.innerHeight
        };
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.filter = `blur(${blur}px)`;
    };

    useEffect(() => {
        handleResize();
        window.addEventListener("resize", handleResize);
        requestRef.current = requestAnimationFrame(render);
        
        return () => {
            window.removeEventListener("resize", handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [blur, backgroundFill, waveOpacity, speed]); // Re-start if these change, but cleanup will stop old ones

    const [isSafari, setIsSafari] = useState(false);
    useEffect(() => {
        setIsSafari(
            typeof window !== "undefined" &&
            navigator.userAgent.includes("Safari") &&
            !navigator.userAgent.includes("Chrome")
        );
    }, []);

    // Optimization: Pause animation when not in viewport
    useEffect(() => {
        const container = canvasRef.current?.parentElement;
        if (!container) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (!requestRef.current) {
                        requestRef.current = requestAnimationFrame(render);
                    }
                } else {
                    if (requestRef.current) {
                        cancelAnimationFrame(requestRef.current);
                        requestRef.current = undefined;
                    }
                }
            },
            { threshold: 0 }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center",
                containerClassName
            )}
        >
            <canvas
                className="absolute inset-0 z-0"
                ref={canvasRef}
                id="canvas"
                style={{
                    ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
                }}
            ></canvas>
            <div className={cn("relative z-10", className)} {...props}>
                {children}
            </div>
        </div>
    );
};
