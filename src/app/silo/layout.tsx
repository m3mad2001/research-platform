import { requireSiloAccess } from "../../lib/silo-access";
import InternalShell from "../../components/InternalShell";

export default async function SiloLayout({ children }: { children: React.ReactNode }) {
  await requireSiloAccess();
  return <InternalShell section="SILO Research">{children}</InternalShell>;
}