import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect to /home immediately
  redirect('/home')
}
