export default function HeroGradientFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(30,58,138,0.08) 0%, transparent 60%),
          #08090a
        `,
        animation: 'heroGradientShift 8s ease-in-out infinite alternate',
      }}
    >
      <style>{`
        @keyframes heroGradientShift {
          from { opacity: 1; }
          to   { opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
