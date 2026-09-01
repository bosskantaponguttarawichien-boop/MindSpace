import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { BoardScope } from "@/infrastructure/persistence/firestore-board-repository";
import { getFirebaseServices } from "@/infrastructure/firebase/client";
import { compressImageForUpload, isSupportedImageType, MAX_SOURCE_IMAGE_BYTES, MAX_STORED_IMAGE_BYTES } from "@/domain/files/image-compression";

export type UploadedImage = { url: string; width: number; height: number };

function userFacingUploadError(error: unknown) {
  const candidate = error as { code?: unknown; serverResponse?: unknown };
  if (candidate?.code === "storage/unauthorized") return "Storage Rules blocked this upload. Publish the Storage Rules, then try again.";
  if (candidate?.code === "storage/quota-exceeded") return "Firebase Storage quota is full.";
  if (candidate?.code === "storage/unknown") return "Firebase Storage is unavailable. Check the Storage bucket and published Storage Rules.";
  return error instanceof Error ? error.message : "Unable to upload this image.";
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
      reject(new Error("This image could not be read."));
    };
    image.src = objectUrl;
  });
}

export async function uploadBoardImage(scope: BoardScope, file: File): Promise<UploadedImage> {
  if (!isSupportedImageType(file.type)) throw new Error("Choose a PNG, JPEG, WEBP, or GIF image.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("Image must be 25 MB or smaller.");

  const preparedFile = await compressImageForUpload(file);
  if (preparedFile.size > MAX_STORED_IMAGE_BYTES) throw new Error("This image is still over 10 MB after compression.");
  const { width, height } = await imageSize(preparedFile);
  const prefix = scope.kind === "shared" ? `workspaces/${scope.workspaceId}` : `users/${scope.uid}`;
  const extension = preparedFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "image";
  const storageRef = ref(getFirebaseServices().storage, `${prefix}/images/${crypto.randomUUID()}.${extension}`);
  try {
    await uploadBytes(storageRef, preparedFile, { contentType: preparedFile.type });
    return { url: await getDownloadURL(storageRef), width, height };
  } catch (error: unknown) {
    throw new Error(userFacingUploadError(error), { cause: error });
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
