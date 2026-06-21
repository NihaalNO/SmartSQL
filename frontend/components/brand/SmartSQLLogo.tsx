import { cn } from "@/lib/utils"

type SmartSQLLogoVariant = "horizontal" | "icon" | "wordmark"
type SmartSQLLogoTone = "light" | "dark" | "mono"

type SmartSQLLogoProps = {
  variant?: SmartSQLLogoVariant
  tone?: SmartSQLLogoTone
  size?: number
  className?: string
  wordmarkClassName?: string
  "aria-label"?: string
}

const toneClassName: Record<SmartSQLLogoTone, string> = {
  light: "text-foreground",
  dark: "text-white",
  mono: "text-current",
}

export function SmartSQLMark({
  size = 32,
  tone = "light",
  className,
  "aria-label": ariaLabel = "SmartSQL",
}: Omit<SmartSQLLogoProps, "variant" | "wordmarkClassName">) {
  const markStroke = tone === "dark" ? "var(--mint-primary)" : "var(--mint-on-primary)"
  const accentStroke = "var(--mint-green)"

  return (
    <svg
      aria-label={ariaLabel}
      role="img"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", toneClassName[tone], className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path
        d="M18 18.5C18 13.8056 46 13.8056 46 18.5C46 23.1944 18 23.1944 18 18.5Z"
        stroke={markStroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 18.5V45.5C18 50.1944 46 50.1944 46 45.5V18.5"
        stroke={markStroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 32C18 36.6944 46 36.6944 46 32"
        stroke={markStroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".72"
      />
      <path
        d="M42 22.5H28.5C24.9101 22.5 22 25.4101 22 29C22 32.5899 24.9101 35.5 28.5 35.5H35.5C39.0899 35.5 42 38.4101 42 42C42 45.5899 39.0899 48.5 35.5 48.5H22"
        stroke={accentStroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42.5 16.5L49 13M45.5 23L52 25.5M47.5 19.5H54"
        stroke={markStroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".86"
      />
      <circle cx="54" cy="19.5" r="2.5" fill={accentStroke} />
    </svg>
  )
}

export function SmartSQLLogo({
  variant = "horizontal",
  tone = "light",
  size = 32,
  className,
  wordmarkClassName,
  "aria-label": ariaLabel = "SmartSQL",
}: SmartSQLLogoProps) {
  if (variant === "icon") {
    return <SmartSQLMark size={size} tone={tone} className={className} aria-label={ariaLabel} />
  }

  const wordmark = (
    <span
      className={cn(
        "font-semibold tracking-[-0.01em]",
        tone === "dark" ? "text-white" : "text-foreground",
        wordmarkClassName,
      )}
    >
      SmartSQL
    </span>
  )

  if (variant === "wordmark") {
    return (
      <span aria-label={ariaLabel} role="img" className={cn("inline-flex items-center", className)}>
        {wordmark}
      </span>
    )
  }

  return (
    <span aria-label={ariaLabel} role="img" className={cn("inline-flex items-center gap-2.5", className)}>
      <SmartSQLMark size={size} tone={tone} aria-label={`${ariaLabel} mark`} />
      {wordmark}
    </span>
  )
}
