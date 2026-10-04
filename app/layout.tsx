import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Press_Start_2P } from 'next/font/google';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const pixel = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel',
});

export const metadata: Metadata = {
  title: 'Governance Division Tracker',
  description: 'Daily leave tracker with WFH schedule.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
