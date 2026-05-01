export default function GridDecorative() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--l-grid-color, rgba(59,130,246,0.03)) 1px, transparent 1px),
          linear-gradient(90deg, var(--l-grid-color, rgba(59,130,246,0.03)) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        pointerEvents: 'none',
        display: 'none',
      }}
      className="lg:block"
    />
  )
}
