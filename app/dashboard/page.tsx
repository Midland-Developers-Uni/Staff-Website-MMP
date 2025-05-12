import ProtectedRoute from "../components/ProtectedRoute";
import DashboardContent from "../components/DashboardContent";
import BackgroundImageCycle from "../components/BackgroundImageCycle";

export const metadata = {
    title: "Staff Portal | Dashboard",
};

export default function DashboardPage() {
    return (
        <>
            <BackgroundImageCycle />
            <ProtectedRoute>
                <DashboardContent />
            </ProtectedRoute>
        </>
    );
}