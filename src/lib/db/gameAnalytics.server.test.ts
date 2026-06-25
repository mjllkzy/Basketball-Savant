import { describe, expect, it, vi } from "vitest";

vi.mock("./client.server", () => ({
  queryDatabase: vi.fn(async () => null),
}));

describe("game analytics fallback", () => {
  it("keeps official JSON game rows available without Postgres", async () => {
    const { listGameAnalytics } = await import("./gameAnalytics.server");
    const result = await listGameAnalytics({ pageSize: 5 });

    expect(result.meta.source).toBe("json");
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0].game.id).toBeTruthy();
    expect(result.rows[0].homeTeam.abbreviation).toBeTruthy();
  });
});
