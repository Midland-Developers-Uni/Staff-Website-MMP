import Topbar from './components/Topbar';
import './globals.css';
import { ThemeProvider } from "./context/ThemeContext";
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
                    <ClientThemeSetter/>
                    <Topbar options={options} />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}