import React from "react";

interface DynamicLightBackgroundProps {
  className?: string;
}

const StaticGradientBackground: React.FC<DynamicLightBackgroundProps> = ({
  className,
}) => {
  return (
    <div
      className={`relative overflow-hidden min-h-screen ${className}`}
      style={{
        background: `
          radial-gradient(at 0% 0%, rgba(255, 255, 255, 0.6) 0%, transparent 50%), /* Biała plama w lewym górnym rogu */
          radial-gradient(at 70% 10%, rgba(210, 117, 151, 0.4) 0%, transparent 60%), /* Różowa plama */
          radial-gradient(at 20% 80%, rgba(98, 25, 224, 0.4) 0%, transparent 60%), /* Fioletowa plama */
          radial-gradient(at 100% 100%, rgba(255, 255, 255, 0.5) 0%, transparent 50%), /* Biała plama w prawym dolnym rogu */
          #f3f6f9 /* Kolor bazowy/tła */
        `,
      }}
    />
  );
};

export default StaticGradientBackground;
