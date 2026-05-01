import { Inter } from 'next/font/google'
import './globals.css'
import LoginPage from '../components/LoginPage'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Barrano — Dashboard',
  description: 'Panou de control intern Barrano',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body className={inter.className}>
        <LoginPage>
          {children}
        </LoginPage>
      </body>
    </html>
  )
}
