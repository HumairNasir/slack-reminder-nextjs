import Header from "@/components/ui/header";
import Sidebar from "@/components/ui/sidebar";
import "./layout.css";

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-container">
      <Header />
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
