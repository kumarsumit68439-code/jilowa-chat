import './globals.css';

export const metadata = {
  title: 'Jilowa Chat',
  description: 'Real-time chat connected to AI Gateway Hub',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
