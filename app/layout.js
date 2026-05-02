import './globals.css'
import LoginPage from '../components/LoginPage'

export const metadata = {
  title: 'Barrano — Dashboard',
  description: 'Panou de control intern Barrano',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <LoginPage>{children}</LoginPage>
      </body>
    </html>
  )
}
