import BackgroundImageCycle from "./components/BackgroundImageCycle";
import AuthForm from "./components/AuthForm";

export const metadata = {
    title: "Staff Portal | Login",
};

export default function LoginPage() {
    return (
        <main>
            <BackgroundImageCycle />
            <AuthForm />
        </main>
    );
}