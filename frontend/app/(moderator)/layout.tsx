// Moderator route layout - ensures user is authenticated as moderator/admin
// Note: Auth is enforced by middleware, not this layout.

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}