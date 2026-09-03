import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/ai/chat/route";

describe("/api/ai/chat route", () => {
  it("processes a valid chat request with mock provider", async () => {
    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextText: "Board Context with 2 nodes",
        messages: [{ role: "user", content: "Summarize this board" }],
        action: "summarize",
        locale: "en",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.text).toBeDefined();
    expect(json.provider).toBe("mock-ai");
    expect(json.isMock).toBe(true);
  });

  it("returns 400 when request body is invalid", async () => {
    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
