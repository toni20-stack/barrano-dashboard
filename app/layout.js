import './globals.css'

export const metadata = {
  title: 'Barrano — Dashboard',
  description: 'Panou de control intern Barrano',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        {children}
      </body>
    </html>
  )
}
