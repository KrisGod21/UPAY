import { requireRole } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { Importer } from "./importer";

export const metadata = { title: "Data import — UPAY Footpathshala" };

export default async function ImportPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: centres } = await supabase.from("centers").select("name").order("name");

  return (
    <>
      <PageHeader
        title="Data import"
        emoji="📥"
        description="Bring the existing spreadsheets in. Years of records should not be retyped, and they should not be thrown away either."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Importer centres={(centres ?? []).map((c) => c.name as string)} />

        <aside className="space-y-4">
          <Card className="bg-sky p-5 text-sky-ink">
            <h3 className="font-bold">Before you start</h3>
            <ul className="mt-2 space-y-2 text-sm opacity-90">
              <li>Export the sheet as CSV — one row per child, one header row at the top.</li>
              <li>Headers can be named anything. You confirm the mapping before anything is written.</li>
              <li>
                The centre column must match a centre that already exists, by name or by code.
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold">What gets cleaned up</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <span className="font-medium text-foreground">Dates</span> — both 09/04/2015 and
                2015-04-09 are understood. An unreadable date stops that row rather than importing a
                wrong one.
              </li>
              <li>
                <span className="font-medium text-foreground">Phone numbers</span> — reduced to the
                last ten digits and prefixed with +91.
              </li>
              <li>
                <span className="font-medium text-foreground">Levels</span> — &ldquo;2&rdquo;,
                &ldquo;Level 2&rdquo; and &ldquo;Class 2&rdquo; all land on the same level.
              </li>
              <li>
                <span className="font-medium text-foreground">Missing student codes</span> —
                generated, so nobody has to invent them.
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold">Re-running is safe</h3>
            <p className="mt-2 text-sm text-muted">
              Import is keyed on student code, so importing the same file twice does not create
              duplicate children.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
