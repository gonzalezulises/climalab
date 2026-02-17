import { AppFooter } from "@/components/layout/app-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/50">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <AppFooter variant="full" />
    </div>
  );
}
