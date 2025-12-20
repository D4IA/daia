import React, { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "neutral" | "info";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "neutral",
  size,
  onClick,
  className = "",
}) => {
  const variantClass = variant ? `btn-${variant}` : "";

  const sizeClass = size ? `btn-${size}` : "";

  const finalClass = `btn ${variantClass} ${sizeClass} ${className}`;

  return (
    <button className={finalClass} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
