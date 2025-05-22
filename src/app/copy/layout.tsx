export default function CopyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This is a simple layout that doesn't enforce authentication
  // It allows the copy route to be accessible without wallet connection
  return (
    <div className="copy-layout">
      {children}
    </div>
  )
} 