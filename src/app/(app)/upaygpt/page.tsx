import { Sparkles } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { UpayGptChat } from "./chat";

export const metadata = { title: "UpayGPT — UPAY Footpathshala" };

export default async function UpayGptPage() {
  const { supabase } = await requireProfile();

  // The audit trail is the feature, not a byproduct — show it beside the chat.
  const { data: recent } = await supabase
    .from("ai_queries")
    .select("id, question, row_count, error, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <>
      <PageHeader
        title="UpayGPT"
        description="Ask a question. It writes the SQL, runs it, and shows you both."
        action={
          <Badge tone="accent">
            <Sparkles className="size-3" /> Gemini 2.5 Flash
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <UpayGptChat />

        <aside className="hidden xl:block">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Recent questions</h3>
            <p className="mt-1 text-xs text-muted">
              Every question and the SQL it produced is logged. An answer nobody can audit is not an
              answer.
            </p>
            <ul className="mt-3 space-y-3">
              {(recent ?? []).map((q) => (
                <li key={q.id} className="border-t border-border pt-3 text-xs first:border-0 first:pt-0">
                  <p className="line-clamp-2 text-foreground">{q.question}</p>
                  <p className="mt-1 text-muted">
                    {q.error ? (
                      <span className="text-warning">blocked or failed</span>
                    ) : (
                      <span>{q.row_count ?? 0} rows</span>
                    )}{" "}
                    · {formatDate(q.created_at)}
                  </p>
                </li>
              ))}
              {!recent?.length ? <li className="text-xs text-muted">Nothing asked yet.</li> : null}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
