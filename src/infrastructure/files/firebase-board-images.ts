import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { BoardScope } from "@/infrastructure/persistence/firestore-board-repository";
import { getFirebaseServices } from "@/infrastructure/firebase/client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type UploadedImage = { url: string; width: number; height: number };

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
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 10 MB or smaller.");

  const { width, height } = await imageSize(file);
  const prefix = scope.kind === "shared" ? `workspaces/${scope.workspaceId}` : `users/${scope.uid}`;
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "image";
  const storageRef = ref(getFirebaseServices().storage, `${prefix}/images/${crypto.randomUUID()}.${extension}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return { url: await getDownloadURL(storageRef), width, height };
}
