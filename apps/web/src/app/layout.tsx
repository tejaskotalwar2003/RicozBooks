import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RicozBooks — Accounting. Control. Intelligence.',
  description: 'RicozBooks is the financial operating platform for growing multi-entity businesses, combining accounting, GST, financial controls, reporting and business intelligence.',
  icons: {
    icon: '/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#F8FAFC]">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased text-slate-900 bg-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}

