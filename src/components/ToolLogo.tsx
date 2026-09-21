import { useState } from "react";
import type { Tool } from "../../shared/catalog";
import { ICONS } from "../data/icons.generated";
import { faviconUrl, hueFor, initials } from "../lib/logo";

export function ToolLogo({ tool, className = "size-8" }: { tool: Tool; className?: string }) {
  const icon = ICONS[tool.iconSlug];
  const [imgFailed, setImgFailed] = useState(false);

  if (icon) {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-label={tool.name} className={className}>
        <path d={icon.path} fill={`#${icon.hex}`} />
      </svg>
    );
  }

  if (!imgFailed) {
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
