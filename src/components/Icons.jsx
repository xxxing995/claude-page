const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const HouseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M4 11.5 12 5l8 6.5" />
    <path d="M6 10.5V19h12v-8.5" />
    <path d="M10 19v-4.5h4V19" />
  </svg>
)

export const PlusIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ChevronIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const ClipIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="m20.5 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
  </svg>
)

export const SendIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </svg>
)

export const GearIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.7}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

export const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
  </svg>
)

export const RefreshIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v5h-5" />
  </svg>
)

export const StopIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
  </svg>
)

export const DocIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M6 3.5h7.5L19 9v11.5H6z" />
    <path d="M13.5 3.5V9H19M9.5 13h6M9.5 16.5h4" />
  </svg>
)

export const CheckSquareIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="m8.5 12 2.6 2.6 4.6-5.2" />
  </svg>
)

export const MoreIcon = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5.5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="18.5" r="1.5" />
  </svg>
)
