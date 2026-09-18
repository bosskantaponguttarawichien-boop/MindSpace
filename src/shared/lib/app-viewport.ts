/**
 * The height of the viewport the page is laid out in, in CSS pixels.
 *
 * This is the whole picture on every platform the app runs on: an installed app
 * owns exactly the web view iOS hands it — the status bar strip above it is the
 * system's, not ours — and a browser tab owns the area its toolbars leave, which
 * is what `100dvh` tracks. Nothing here tries to reach past that box: the pixels
 * outside it belong to the platform and no layout can paint on them.
 */
export function measureViewportHeight(): number {
  return document.documentElement.clientHeight || window.innerHeight;
}
