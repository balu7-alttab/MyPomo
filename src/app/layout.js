import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'MyPomo — Focus & Habit Tracker',
  description: 'Categorized Pomodoro timer with habit tracking and focus analytics. Own your time.',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#09090f',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyPomo',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#09090f" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
