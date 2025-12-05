// src/components/SvgIcon.tsx
import { icons, type IconName } from "../utils/icons";

interface SvgIconProps {
  name: IconName;
  size?: number;
  className?: string;
  alt?: string;
  onClick?: () => void; 
}

export default function SvgIcon({
  name,
  size = 32,
  className = "",
  alt,
  onClick,
}: SvgIconProps) {
  const src = icons[name];

  if (!src) {
    console.error(`Icon "${name}" not found in icons map.`);
    return null;
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt={alt ?? name}
      onClick={onClick}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
