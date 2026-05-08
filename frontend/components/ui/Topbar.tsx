interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  return (
    <div
      className="flex items-center justify-between mb-4"
      style={{ paddingBottom: 16, borderBottom: "0.5px solid #1e2433" }}
    >
      <h1 className="text-lg font-semibold" style={{ color: "#f1f5f9" }}>
        {title}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
