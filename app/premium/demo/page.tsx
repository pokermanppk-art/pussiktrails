export const dynamic = 'force-static'

export default function PremiumDemoPage() {
  return (
    <main
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#0f172a',
        margin: 0,
        padding: 0
      }}
    >
      <iframe
        src="/premium/demo.html"
        title="Página Premium PrussikTrails"
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block'
        }}
      />
    </main>
  )
}