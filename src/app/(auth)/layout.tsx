import { ThemeToggle } from "@/components/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
