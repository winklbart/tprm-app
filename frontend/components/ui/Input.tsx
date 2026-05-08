interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", style, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium" style={{ color: "#64748b" }}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full text-sm outline-none transition-colors ${className}`}
        style={{
          background: "#0f1117",
          border: `0.5px solid ${error ? "#f87171" : "#1e2433"}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: "#f1f5f9",
          ...style,
        }}
        {...props}
      />
      {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, id, className = "", style, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium" style={{ color: "#64748b" }}>
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full text-sm outline-none ${className}`}
        style={{
          background: "#0f1117",
          border: `0.5px solid ${error ? "#f87171" : "#1e2433"}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: "#f1f5f9",
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, id, className = "", style, ...props }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium" style={{ color: "#64748b" }}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full text-sm outline-none resize-y ${className}`}
        style={{
          background: "#0f1117",
          border: `0.5px solid ${error ? "#f87171" : "#1e2433"}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: "#f1f5f9",
          minHeight: 80,
          ...style,
        }}
        {...props}
      />
      {error && <span className="text-xs" style={{ color: "#f87171" }}>{error}</span>}
    </div>
  );
}
