// src/components/layout/PageHeader.jsx
export default function PageHeader({ icon, title, subtitle, actions, children, border = true }) {
  return (
    <header className={`shrink-0 px-6 ${border ? "border-b border-line" : ""}`}>
      <div className="flex items-center gap-3 min-h-14 py-2.5">
        {icon && <span className="grid place-items-center size-7 rounded-lg bg-subtle text-ink-2 shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h1 className="h-page truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted truncate -mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
