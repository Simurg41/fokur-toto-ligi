"use client";

import { useState } from "react";

type TeamNameWithLogoProps = {
  name: string;
  externalTeamId?: number | null;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: {
    wrapper: "gap-1.5",
    mark: "h-5 w-5 text-[10px]",
    text: "text-sm",
  },
  md: {
    wrapper: "gap-2",
    mark: "h-6 w-6 text-xs",
    text: "text-base",
  },
};

export function TeamNameWithLogo({ name, externalTeamId, size = "sm" }: TeamNameWithLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const classes = sizeClasses[size];
  const canShowLogo = typeof externalTeamId === "number" && Number.isFinite(externalTeamId) && !hasImageError;

  return (
    <span className={`flex min-w-0 items-center ${classes.wrapper}`}>
      {canShowLogo ? (
        <img
          src={`https://cdn.broadage.com/images-teams/soccer/72x72/${externalTeamId}.png`}
          alt={`${name} logosu`}
          onError={() => setHasImageError(true)}
          className={`${classes.mark} shrink-0 object-contain`}
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${classes.mark} flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600`}
        >
          {name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?"}
        </span>
      )}
      <span className={`min-w-0 truncate font-semibold text-slate-950 ${classes.text}`}>{name}</span>
    </span>
  );
}
