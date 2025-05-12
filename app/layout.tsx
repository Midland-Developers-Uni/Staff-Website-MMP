import Topbar from './components/Topbar';
import './globals.css';
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ClientThemeSetter from "./components/ClientThemeSetter";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const options = {
        loggedIn: false
    }
    return (
        <html lang="en">
            <head />
            <body>
                <ThemeProvider>
                    <AuthProvider>
                        <ClientThemeSetter/>
                        <Topbar options={options} />
                        {children}
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}