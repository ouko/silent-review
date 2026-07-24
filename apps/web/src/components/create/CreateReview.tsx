import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useCreateReview, type Product } from "../../hooks/useCreateReview";
import { ProductSearch } from "./ProductSearch";
import { CameraRecorder } from "./CameraRecorder";
import { ReviewFinalize } from "./ReviewFinalize";
import { Clapperboard } from "lucide-react";

type Step = "product" | "record" | "finalize";

const STEPS: { id: Step; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "record", label: "Record" },
  { id: "finalize", label: "Publish" },
];

export function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duetOfId = searchParams.get("duet");
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const { createReview, isPending, isUploading, progress, error, reset } = useCreateReview({
    onSuccess: () => navigate("/"),
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
      setUploadError("Upload failed. You can retry without re-recording.");
    }
  }, [error]);

  function handleProductSelect(product: Product) {
    setSelectedProduct(product);
    setStep("record");
  }

  const handleRecorded = useCallback((blob: Blob) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setRecordedBlob(blob);
    previewUrlRef.current = URL.createObjectURL(blob);
    setUploadError(null);
    setStep("finalize");
  }, []);

  function handleBackToRecord() {
    setUploadError(null);
    reset();
    setStep("record");
  }

  async function handleSubmit(input: { rating: number; caption: string; tag?: string }) {
    if (!recordedBlob || !selectedProduct) return;

    setUploadError(null);
    reset();

    const extension = recordedBlob.type === "video/mp4" ? ".mp4" : recordedBlob.type === "video/quicktime" ? ".mov" : ".webm";
    const file = new File([recordedBlob], `review${extension}`, { type: recordedBlob.type || "video/webm" });

    createReview({
      file,
      review: {
        productId: selectedProduct.id,
        product: selectedProduct,
        rating: input.rating,
        caption: input.caption,
        productTag: input.tag,
        duetOfId,
      },
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500">
              <Clapperboard className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Create review</h1>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-4 flex items-center gap-2">
          {STEPS.map((s, index) => {
            const isActive = step === s.id;
            const isCompleted =
              (s.id === "product" && selectedProduct !== null) ||
              (s.id === "record" && recordedBlob !== null) ||
              (s.id === "finalize" && false);
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? "bg-white/15 text-white"
                      : isCompleted
                        ? "bg-white/5 text-white/70"
                        : "bg-transparent text-white/40"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      isActive
                        ? "bg-gradient-to-br from-rose-500 to-violet-500 text-white"
                        : isCompleted
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/10 text-white/50"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {s.label}
                </div>
                {index < STEPS.length - 1 && <div className="h-px w-4 bg-white/10" />}
              </div>
            );
          })}
        </div>
      </div>

      <motion.div
        key={step}
        initial={reducedMotion ? {} : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-1 overflow-y-auto p-4 pt-0"
      >
        {step === "product" && (
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm font-medium text-white/60">What are you reviewing?</p>
            <ProductSearch selected={selectedProduct} onSelect={handleProductSelect} />
          </div>
        )}

        {step === "record" && (
          <CameraRecorder onRecorded={handleRecorded} onCancel={() => setStep("product")} />
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
