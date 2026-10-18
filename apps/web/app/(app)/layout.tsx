import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getSession } from "@/lib/auth";
import { TRPCReactProvider } from "@/lib/trpc/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/sign-in");
  return (
    <TRPCReactProvider>
      {children}
      <Toaster theme="dark" position="bottom-center" />
    </TRPCReactProvider>
  );
}
