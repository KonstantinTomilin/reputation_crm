// @ts-expect-error no types for html2pdf.js
import html2pdf from 'html2pdf.js';

export async function downloadHtmlAsPdf(
  html: string,
  filename: string,
  options?: { margin?: number; orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.fontFamily = 'Arial, sans-serif';
  await html2pdf()
    .set({
      margin: options?.margin ?? 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: options?.orientation ?? 'portrait' },
    })
    .from(container)
    .save();
}
