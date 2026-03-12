interface RotoBotLogoProps {
  size?: number;
  className?: string;
}

const ROTOBOT_LOGO_SRC = "/rotobot-logo.png";

export function RotoBotLogo({ size = 40, className = "" }: RotoBotLogoProps) {
  return (
    <img
      src={ROTOBOT_LOGO_SRC}
      alt="RotoBot"
      className={`rounded-[22%] object-contain ${className}`}
      style={{ width: size, height: size }}
      width={size}
      height={size}
    />
  );
}
