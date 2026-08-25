"use client";
import { useEffect, useState } from "react";

interface CardProps {
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
  animateValue?: boolean;
  delay?: number;
}

export default function Card({
  title,
  value,
  sub,
  accent = "var(--cyan)",
  icon,
  animateValue = false,
  delay = 0,
}: CardProps) {
  const [display, setDisplay] = useState<string | number>(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!animateValue || typeof value !== "number") {
      setDisplay(value);
      return;
    }

    let start = 0;
    const end = value as number;
    const dur = 900;

    const step = (ts: number, origin: number) => {
      const p = Math.min((ts - origin) / dur, 1);
      setDisplay(Math.floor(p * end));
      if (p < 1) requestAnimationFrame((t) => step(t, origin));
    };

    const delay_ = setTimeout(() => {
      requestAnimationFrame((t) => step(t, t));
    }, delay);

    return () => clearTimeout(delay_);
  }, [value, animateValue, delay]);

  return (
    <div
      className="card fade-up"
      style={{
        padding: "20px 22px",
        animationDelay: `${delay}ms`,
        cursor: "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -24,
          right: -24,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: accent,
          filter: "blur(30px)",
          opacity: 0.11,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <span className="label">{title}</span>
        {icon && <span style={{ color: "var(--muted)" }}>{icon}</span>}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent,
          letterSpacing: "-.03em",
          lineHeight: 1,
          fontFamily: "var(--font-ui)",
          animation: "counter .5s ease both",
          animationDelay: `${delay + 100}ms`,
        }}
      >
        {typeof display === "number" ? display.toLocaleString() : display}
      </div>

      {mounted && sub && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--muted)",
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}