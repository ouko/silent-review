import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useCreateReview, type Product } from "../../hooks/useCreateReview";
import { ProductSearch } from "./ProductSearch";
import { CameraRecorder } from "./CameraRecorder";
import { ReviewFinalize } from "./ReviewFinalize";
import { Clapperboard } from "lucide-react";

export function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duetOfId = searchParams.get("duet");
  const reducedMotion = useReducedMotion();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const { createReview, isPending, isUploading, progress, error, reset } = useCreateReview({
    onSuccess: (review) => navigate(`/review/${review.id}`),
  });

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (error) {
      setUploadError(error.message || "Upload failed. You can retry without re-recording.");
    }
  }, [error]);

  function handleProductSelect(product: Product) {
    setSelectedProduct(product);
  }

  const handleRecorded = useCallback((blob: Blob) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setRecordedBlob(blob);
    previewUrlRef.current = URL.createObjectURL(blob);
    setUploadError(null);
  }, []);

  function handleBackToRecord() {
    setUploadError(null);
    reset();
    setRecordedBlob(null);
  }

  async function handleSubmit(input: { rating: number; caption: string; tag?: string; allowComments: boolean }) {
    if (!recordedBlob || !selectedProduct) return;

    setUploadError(null);
    reset();

    let extension: string;
    let fileType: string;
    if (recordedBlob.type === "video/mp4") {
      extension = ".mp4";
      fileType = "video/mp4";
    } else if (recordedBlob.type === "video/quicktime") {
      extension = ".mov";
      fileType = "video/quicktime";
    } else if (recordedBlob.type === "video/webm") {
      extension = ".webm";
      fileType = "video/webm";
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      extension = isIOS ? ".mp4" : ".webm";
      fileType = recordedBlob.type || (isIOS ? "video/mp4" : "video/webm");
    }
    const file = new File([recordedBlob], `review${extension}`, { type: fileType });

    createReview({
      file,
      review: {
        productId: selectedProduct.id,
        product: selectedProduct,
        rating: input.rating,
        caption: input.caption,
        productTag: input.tag,
        allowComments: input.allowComments,
        duetOfId,
      },
    });
  }

  const step = !selectedProduct ? "product" : !recordedBlob ? "record" : "finalize";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="safe-top px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-pink text-white shadow-glow">
            <Clapperboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-white">Create review</h1>
            <p className="text-xs text-white/50">
              {step === "product" && "Pick a product"}
              {step === "record" && "Record a 5s video"}
              {step === "finalize" && "Rate and post"}
            </p>
          </div>
        </div>
      </div>

      <motion.div
        key={step}
        initial={reducedMotion ? {} : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 overflow-y-auto p-4 pt-0 no-scrollbar"
      >
        {step === "product" && (
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm font-medium text-white/60">What are you reviewing?</p>
            <ProductSearch selected={selectedProduct} onSelect={handleProductSelect} />
          </div>
        )}

        {step === "record" && (
          <CameraRecorder onRecorded={handleRecorded} onCancel={() => setSelectedProduct(null)} />
        )}

        {step === "finalize" && previewUrlRef.current && (
          <ReviewFinalize
            previewUrl={previewUrlRef.current}
            onSubmit={handleSubmit}
            onBack={handleBackToRecord}
            isUploading={isPending || isUploading}
            progress={progress}
            error={uploadError}
          />
        )}
      </motion.div>
    </div>
  );
}
