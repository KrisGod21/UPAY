import { AppShell } from "@/components/app-shell";
import { LanguageProvider } from "@/lib/i18n";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();

  return (
    <LanguageProvider>
      <AppShell profile={profile} signOutAction={signOut}>
        {children}
      </AppShell>
    </LanguageProvider>
  );
}
