interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className = "", style, children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-opacity disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };

  const styles: React.CSSProperties = {
    borderRadius: 8,
    border: "0.5px solid transparent",
    cursor: "pointer",
    ...(variant === "primary" && { background: "#4f46e5", color: "#f1f5f9", borderColor: "#4f46e5" }),
    ...(variant === "secondary" && { background: "transparent", color: "#f1f5f9", borderColor: "#1e2433" }),
    ...(variant === "danger" && { background: "transparent", color: "#f87171", borderColor: "#f8717140" }),
    ...style,
  };

  return (
    <button className={`${base} ${sizes[size]} ${className}`} style={styles} {...props}>
      {children}
    </button>
  );
}
