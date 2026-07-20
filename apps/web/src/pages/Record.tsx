import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useUpload } from "../hooks/useUpload";
import { ProductSearch, type Product } from "../components/create/ProductSearch";
import { CameraRecorder } from "../components/create/CameraRecorder";
import { ReviewFinalize } from "../components/create/ReviewFinalize";

type Step = "product" | "record" | "finalize";

export function Record() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const { upload, progress, isUploading } = useUpload({
    onError: () => alert("Upload failed. Please try again."),
  });

  function handleProductSelect(product: Product) {
    setSelectedProduct(product);
    setStep("record");
  }

  function handleRecorded(blob: Blob) {
    setRecordedBlob(blob);
    previewUrlRef.current = URL.createObjectURL(blob);
    setStep("finalize");
  }

  async function handleSubmit(input: { rating: number; caption: string }) {
    if (!recordedBlob || !selectedProduct) return;

    try {
      const file = new File([recordedBlob], "review.webm", { type: "video/webm" });
      const uploadResult = await upload(file);

      await api.post("/api/reviews", {
        productId: selectedProduct.id,
        videoUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        duration: uploadResult.duration,
        format: "video/webm",
        rating: input.rating,
        caption: input.caption,
        productTag: selectedProduct.category,
      });

      navigate("/");
    } catch {
      // Error handled by hook.
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Create review</h1>
        <div className="flex gap-1">
          {(["product", "record", "finalize"] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full ${
                step === s ? "bg-brand-500" : "bg-white/20"
              }`}
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
        <CameraRecorder
          onRecorded={handleRecorded}
          onCancel={() => setStep("product")}
        />
      )}

      {step === "finalize" && previewUrlRef.current && (
        <ReviewFinalize
          previewUrl={previewUrlRef.current}
          onSubmit={handleSubmit}
          onBack={() => setStep("record")}
          isUploading={isUploading}
          progress={progress}
        />
      )}
    </div>
  );
}
