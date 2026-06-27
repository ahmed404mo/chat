"use client";

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export default function ShinyText({
  text,
  className = "",
  speed = 3,
}: ShinyTextProps) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r from-current via-white to-current bg-[length:200%_100%] animate-shimmer ${className}`}
      style={{
        animationDuration: `${speed}s`,
        backgroundImage:
          "linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.9) 50%, currentColor 100%)",
      }}
    >
      {text}
    </span>
  );
}
