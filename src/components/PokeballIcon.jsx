import { useId } from 'react';

const VIEW_BOX = '0 0 100 100';

function PokeballGraphic({ clipId }) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="49" fill="#b8bcc6" />
      <circle cx="50" cy="50" r="46.5" fill="#fff" />

      <path d="M4 50 A46 46 0 0 0 96 50 Z" fill="#fff" />
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#ee1515" />

      <ellipse
        cx="36"
        cy="28"
        rx="20"
        ry="12"
        fill="#ff9a9a"
        opacity="0.65"
        clipPath={`url(#${clipId})`}
      />
      <ellipse
        cx="64"
        cy="73"
        rx="18"
        ry="11"
        fill="#c5cad3"
        opacity="0.75"
        clipPath={`url(#${clipId})`}
      />

      <rect
        x="4"
        y="45.5"
        width="92"
        height="9"
        fill="#1f1f1f"
        clipPath={`url(#${clipId})`}
      />

      <circle cx="50" cy="50" r="15" fill="#1f1f1f" />
      <circle cx="50" cy="50" r="10.5" fill="#fff" />
      <circle cx="50" cy="50" r="10.5" fill="none" stroke="#e8eaee" strokeWidth="0.8" />
    </>
  );
}

export default function PokeballIcon({ size = 30, className }) {
  const clipId = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <PokeballGraphic clipId={clipId} />
    </svg>
  );
}

export function getPokeballFaviconHref() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}"><defs><clipPath id="c"><circle cx="50" cy="50" r="46"/></clipPath></defs><circle cx="50" cy="50" r="49" fill="#b8bcc6"/><circle cx="50" cy="50" r="46.5" fill="#fff"/><path d="M4 50A46 46 0 0 0 96 50Z" fill="#fff"/><path d="M4 50A46 46 0 0 1 96 50Z" fill="#ee1515"/><ellipse cx="36" cy="28" rx="20" ry="12" fill="#ff9a9a" opacity=".65" clip-path="url(#c)"/><ellipse cx="64" cy="73" rx="18" ry="11" fill="#c5cad3" opacity=".75" clip-path="url(#c)"/><rect x="4" y="45.5" width="92" height="9" fill="#1f1f1f" clip-path="url(#c)"/><circle cx="50" cy="50" r="15" fill="#1f1f1f"/><circle cx="50" cy="50" r="10.5" fill="#fff"/><circle cx="50" cy="50" r="10.5" fill="none" stroke="#e8eaee" stroke-width=".8"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
