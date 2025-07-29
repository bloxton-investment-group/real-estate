// Centralized PDF.js loader with optimizations
let pdfjsLib: any = null;
let pdfjsWorkerSrc: string | null = null;

export async function getPdfLib() {
  if (!pdfjsLib) {
    // Only import when needed
    const pdfjs = await import('pdfjs-dist');
    pdfjsLib = pdfjs;
    
    // Set worker source
    if (typeof window !== 'undefined' && !pdfjsWorkerSrc) {
      pdfjsWorkerSrc = '/pdf.worker.min.mjs';
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;
    }
  }
  
  return pdfjsLib;
}

export async function getDocument(url: string) {
  const pdfjs = await getPdfLib();
  return pdfjs.getDocument(url);
}