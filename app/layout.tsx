import Topbar from './components/Topbar';
import './globals.css';
import { ThemeProvider } from "./context/ThemeContext";
import ClientThemeSetter from "./components/ClientThemeSetter";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head />
            <body>
                <ThemeProvider>
                    <ClientThemeSetter/>
                    <Topbar />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}