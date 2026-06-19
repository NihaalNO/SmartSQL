// Protected route layout - ensures user is authenticated
// Note: Auth is enforced by middleware, not this layout.

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}