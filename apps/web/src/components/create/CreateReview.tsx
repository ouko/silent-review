import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreateReview, type Product } from "../../hooks/useCreateReview";
import { ProductSearch } from "./ProductSearch";
import { CameraRecorder } from "./CameraRecorder";
import { ReviewFinalize } from "./ReviewFinalize";

type Step = "product" | "record" | "finalize";

export function CreateReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duetOfId = searchParams.get("duet");

  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const { createReview, isPending, isUploading, progress, error, reset } = useCreateReview({
    onSuccess: () => navigate("/"),
  });

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
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Create review</h1>
        <div className="flex gap-1">
          {(["product", "record", "finalize"] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${step === s ? "bg-brand-500" : "bg-white/20"}`}
            />
          ))}
        </div>
      </div>

      {step === "product" && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-white/60">What are you reviewing?</p>
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
    </div>
  );
}
