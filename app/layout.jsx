import Script from 'next/script';
import '../src/css/index.css';
import Providers from '../src/components/Providers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SchoolApp Control',
  description: 'ระบบบริหารจัดการโรงเรียน',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        {}
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
