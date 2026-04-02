import { redirect } from 'next/navigation'

// Dashboard has moved to /now
export default function DashboardRedirect() {
  redirect('/now')
}
