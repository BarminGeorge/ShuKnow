import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.js?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  fileId: string;
  fileName: string;
}

interface PdfPageCanvasProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  viewportWidth: number;
  zoom: number;
  onError: (error: Error) => void;
}

function PdfPageCanvas({ document, pageNumber, viewportWidth, zoom, onError }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      if (viewportWidth <= 0) return;

      setIsRendering(true);

      try {
        const page = await document.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.1, (viewportWidth / baseViewport.width) * zoom);
        const viewport = page.getViewport({ scale: fitScale });
        setPageHeight(Math.ceil(viewport.height));

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (error) {
        const isRenderCancelled =
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "RenderingCancelledException";

        if (!isCancelled && !isRenderCancelled) {
          console.error(`Failed to render PDF page ${pageNumber}:`, error);
          onError(error instanceof Error ? error : new Error(String(error)));
          setIsRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [document, onError, pageNumber, viewportWidth, zoom]);

  return (
    <div
      className="relative rounded-md bg-white shadow-[0_14px_28px_rgba(0,0,0,0.35)] overflow-hidden"
      style={{ minHeight: pageHeight ?? 160 }}
    >
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#101010] text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block"
        aria-label={`PDF page ${pageNumber}`}
      />
    </div>
  );
}

export function PdfViewer({ fileId, fileName }: PdfViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setViewportWidth(Math.max(0, Math.floor(width - 40)));
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let activeDocument: PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      setPageCount(0);
      setPdfDocument(null);

      try {
        const response = await fetch(`/api/files/${fileId}/content`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("pdf")) {
          throw new Error(`Неверный content-type: ${contentType || "unknown"}`);
        }

        const buffer = await response.arrayBuffer();
        const loadingTask = getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false,
        });
        const document = await loadingTask.promise;

        if (isCancelled) {
          void document.destroy();
          return;
        }

        activeDocument = document;
        setPdfDocument(document);
        setPageCount(document.numPages);
      } catch (loadError) {
        console.error("Failed to initialize PDF preview:", loadError);
        if (!isCancelled) {
          const details = loadError instanceof Error ? loadError.message : String(loadError);
          setError(`Не удалось отобразить PDF внутри приложения. ${details}`);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPdf();

    return () => {
      isCancelled = true;
      if (activeDocument) {
        void activeDocument.destroy();
      }
    };
  }, [fileId]);

  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

  const handlePageRenderError = (renderError: Error) => {
    setError((previousError) => {
      if (previousError) return previousError;
      return `Ошибка рендера PDF. ${renderError.message}`;
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0e0e0e]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-[#111111]">
        <div className="text-xs text-gray-400 truncate" title={fileName}>
          {fileName}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 text-gray-300 hover:bg-white/10"
            title="Уменьшить"
            type="button"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-gray-300 min-w-[48px] text-center">{zoomPercent}%</span>
          <button
            onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.1))}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 text-gray-300 hover:bg-white/10"
            title="Увеличить"
            type="button"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div ref={wrapperRef} className="flex-1 overflow-auto px-5 py-4 chat-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 size={30} className="animate-spin" />
            <p className="text-sm">Загружаем PDF...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
            <FileText size={48} className="opacity-40" />
            <p className="text-sm text-center max-w-xl">{error}</p>
          </div>
        ) : pdfDocument && pageCount > 0 ? (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: pageCount }).map((_, index) => (
              <PdfPageCanvas
                key={`${fileId}-page-${index + 1}`}
                document={pdfDocument}
                pageNumber={index + 1}
                viewportWidth={viewportWidth}
                zoom={zoom}
                onError={handlePageRenderError}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
            <FileText size={48} className="opacity-40" />
            <p className="text-sm">PDF пустой или не содержит страниц.</p>
          </div>
        )}
      </div>
    </div>
  );
}
