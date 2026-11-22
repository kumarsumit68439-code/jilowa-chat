import { redirect } from 'next/navigation';

// Setup notice page removed — redirect to login
export default function Setup() {
  redirect('/login');
}
