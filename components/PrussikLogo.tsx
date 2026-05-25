type PrussikLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  variant?: 'dark' | 'light'
}

export default function PrussikLogo({
  size = 'md',
  showText = true,
  variant = 'light'
}: PrussikLogoProps) {
  const imageHeight = {
    sm: 34,
    md: 44,
    lg: 58
  }[size]

  const textSize = {
    sm: 18,
    md: 24,
    lg: 32
  }[size]

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        lineHeight: 1
      }}
    >
      <img
        src="/logo-prussik-display.png"
        alt="PrussikTrails"
        style={{
          height: imageHeight,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          filter: variant === 'dark' ? 'invert(1)' : 'none'
        }}
      />

      {showText && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 900,
            color: variant === 'dark' ? '#ffffff' : '#dc2626',
            letterSpacing: '-0.04em'
          }}
        >
          PrussikTrails
        </span>
      )}
    </div>
  )
}