import { useState } from "react";
import { CATEGORIES_BY_ID, type Tool } from "../../shared/catalog";
import { ICONS } from "../data/icons.generated";
import { faviconUrl, hueFor, initials } from "../lib/logo";

function Monogram({ tool, className }: { tool: Tool; className: string }) {
  return (
    <div
      role="img"
      aria-label={tool.name}
      className={`${className} grid place-items-center rounded-md text-[0.6em] font-bold text-white`}
      style={{ background: `hsl(${hueFor(tool.name)} 55% 45%)` }}
    >
      {initials(tool.name)}
    </div>
  );
}

export function ToolLogo({ tool, className = "size-8" }: { tool: Tool; className?: string }) {
  const icon = ICONS[tool.iconSlug];
  const [imgFailed, setImgFailed] = useState(false);

  if (tool.placeholder) {
    const color = CATEGORIES_BY_ID[tool.categoryId]?.color ?? "#64748b";
    return (
      <svg viewBox="0 0 24 24" role="img" aria-label={tool.name} className={className} fill="none" stroke={color}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" strokeWidth="2" strokeDasharray="3.2 2.4" />
        <path d="M12 8v8M8 12h8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon) {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-label={tool.name} className={className}>
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    );
  }

  if (!tool.custom && !imgFailed) {
    return (
      <img
        src={faviconUrl(tool.website)}
        alt={tool.name}
        className={`${className} rounded-md object-contain`}
        draggable={false}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <Monogram tool={tool} className={className} />;
}
