export type LocalFile = { name: string; type: string; size: number };

export function isSupportedPdf(file: LocalFile) {
  return file.size <= 25 * 1024 * 1024 && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}
