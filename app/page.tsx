import BackgroundImageCycle from "./components/BackgroundImageCycle";

export const metadata = {
    title: "Staff Portal | Login",
};

export default function LoginPage() {
    return (
        <main>
            <BackgroundImageCycle />
            <h1>Staff Portal Login</h1>
            <p>Please enter your credentials to log in.</p>
        </main>
    );
}