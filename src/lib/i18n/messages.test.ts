import { describe, expect, it } from "vitest";
import { messages, translate } from "@/lib/i18n/messages";

describe("message catalogs", () => {
  it("keeps Thai and English catalogs aligned", () => {
    expect(Object.keys(messages.th).toSorted()).toEqual(Object.keys(messages.en).toSorted());
  });

  it("returns the selected translation", () => {
    expect(translate("th", "newBoard")).toBe("บอร์ดใหม่");
    expect(translate("en", "newBoard")).toBe("New board");
  });
});
