import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Governance Division Tracker',
  description: 'Daily leave tracker with WFH schedule.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
