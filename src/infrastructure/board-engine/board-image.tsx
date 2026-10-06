import { memo, useEffect, useState } from "react";
import { Image as KonvaImage, Rect } from "react-konva";
import type { BoardElement } from "@/domain/board/board-document";

const imageElementCache = new Map<string, HTMLImageElement>();

export const BoardImage = memo(function BoardImage({ element }: { element: BoardElement }) {
  const assetUrl = element.assetUrl;
  const cached = assetUrl ? imageElementCache.get(assetUrl) ?? null : null;
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const image = cached ?? loadedImage;

  useEffect(() => {
    if (!assetUrl || imageElementCache.has(assetUrl)) return;
    let cancelled = false;
    let pending: HTMLImageElement | null = null;

    function load(source: string, anonymous: boolean) {
      const next = new window.Image();
      pending = next;
      if (anonymous) next.crossOrigin = "anonymous";
      next.onload = () => {
        imageElementCache.set(source, next);
        if (!cancelled) setLoadedImage(next);
      };
      next.onerror = () => {
        if (cancelled) return;
        if (anonymous) load(source, false);
        else setLoadedImage(null);
      };
      next.src = source;
    }

    load(assetUrl, true);
    return () => {
      cancelled = true;
      if (!pending) return;
      pending.onload = null;
      pending.onerror = null;
    };
  }, [assetUrl]);

  return image
    ? <KonvaImage image={image} width={element.width} height={element.height} cornerRadius={12} perfectDrawEnabled={false} />
    : <Rect width={element.width} height={element.height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} cornerRadius={12} perfectDrawEnabled={false} />;
});
