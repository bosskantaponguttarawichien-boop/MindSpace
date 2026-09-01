import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { BoardScope } from "@/infrastructure/persistence/firestore-board-repository";
import { getFirebaseServices } from "@/infrastructure/firebase/client";
import { compressImageForUpload, isSupportedImageType, MAX_SOURCE_IMAGE_BYTES, MAX_STORED_IMAGE_BYTES } from "@/domain/files/image-compression";

export type UploadedImage = { url: string; width: number; height: number };

export type ImageUploadFailure =
  | "unsupportedType"
  | "tooLarge"
  | "stillTooLarge"
  | "unreadable"
  | "rulesBlocked"
  | "quotaExceeded"
  | "bucketUnavailable"
  | "unreachable"
  | "failed";

/** Carries a stable reason so the UI can render it in the reader's language. */
export class ImageUploadError extends Error {
  readonly reason: ImageUploadFailure;

  constructor(reason: ImageUploadFailure, cause?: unknown) {
    super(reason, { cause });
    this.name = "ImageUploadError";
    this.reason = reason;
  }
}

function uploadFailure(error: unknown): ImageUploadFailure {
  const code = (error as { code?: unknown })?.code;
  if (code === "storage/unauthorized" || code === "storage/unauthenticated") return "rulesBlocked";
  if (code === "storage/quota-exceeded") return "quotaExceeded";
  if (code === "storage/bucket-not-found" || code === "storage/project-not-found") return "bucketUnavailable";
  if (code === "storage/retry-limit-exceeded") return "unreachable";
  if (code === "storage/unknown") return "bucketUnavailable";
  return "failed";
}

function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageUploadError("unreadable"));
    };
    image.src = objectUrl;
  });
}

export async function uploadBoardImage(scope: BoardScope, file: File): Promise<UploadedImage> {
  if (!isSupportedImageType(file.type)) throw new ImageUploadError("unsupportedType");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new ImageUploadError("tooLarge");

  const preparedFile = await compressImageForUpload(file);
  if (preparedFile.size > MAX_STORED_IMAGE_BYTES) throw new ImageUploadError("stillTooLarge");
  const { width, height } = await imageSize(preparedFile);
  const prefix = scope.kind === "shared" ? `workspaces/${scope.workspaceId}` : `users/${scope.uid}`;
  const extension = preparedFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "image";
  const storageRef = ref(getFirebaseServices().storage, `${prefix}/images/${crypto.randomUUID()}.${extension}`);
  try {
    await uploadBytes(storageRef, preparedFile, { contentType: preparedFile.type });
    return { url: await getDownloadURL(storageRef), width, height };
  } catch (error: unknown) {
    throw new ImageUploadError(uploadFailure(error), error);
  }
}

export async function deleteBoardImages(urls: string[]) {
  await Promise.all(urls.map(async (url) => {
    try {
      await deleteObject(ref(getFirebaseServices().storage, url));
    } catch (error: unknown) {
      const code = (error as { code?: unknown })?.code;
      if (code !== "storage/object-not-found") throw error;
    }
  }));
}
