import { describe, expect, it } from "vitest";
import { ImageUploadError, uploadBoardImage } from "@/infrastructure/files/firebase-board-images";
import { MAX_SOURCE_IMAGE_BYTES } from "@/domain/files/image-compression";

const scope = { kind: "personal", uid: "user-1" } as const;

function file(name: string, type: string, size: number) {
  const blob = new Blob([new Uint8Array(1)], { type });
  return Object.defineProperty(new File([blob], name, { type }), "size", { value: size });
}

describe("uploadBoardImage", () => {
  it("rejects an unsupported file type with a translatable reason", async () => {
    await expect(uploadBoardImage(scope, file("notes.pdf", "application/pdf", 1024)))
      .rejects.toMatchObject({ name: "ImageUploadError", reason: "unsupportedType" });
  });

  it("rejects a source image over the size cap before uploading", async () => {
    const error = await uploadBoardImage(scope, file("huge.png", "image/png", MAX_SOURCE_IMAGE_BYTES + 1)).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ImageUploadError);
    expect((error as ImageUploadError).reason).toBe("tooLarge");
  });
});
