import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attendance & WFH Dashboard',
  description: 'Daily leave tracker with WFH schedule and admin override.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
