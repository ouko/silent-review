import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useUpload } from "../hooks/useUpload";
import { Button } from "../components/ui/Button";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
}

export function Record() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", category: "" });

  const { upload, progress, isUploading } = useUpload({
    onError: () => alert("Upload failed. Please try again."),
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!productQuery.trim()) {
        setProducts([]);
        return;
      }
      try {
        const { data } = await api.get(`/api/products/search?q=${encodeURIComponent(productQuery)}`);
        setProducts(data.products ?? []);
      } catch {
        setProducts([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productQuery]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (videoRef.current) videoRef.current.srcObject = stream;

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      mediaRef.current = blob;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setPreviewUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setRecording(true);
    setCountdown(5);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          if (recorder.state !== "inactive") recorder.stop();
          setRecording(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleUpload() {
    const blob = mediaRef.current;
    if (!blob) return;
    if (!selectedProduct) {
      alert("Please select a product");
      return;
    }

    try {
      const file = new File([blob], "review.webm", { type: "video/webm" });
      const uploadResult = await upload(file);

      await api.post("/api/reviews", {
        productId: selectedProduct.id,
        videoUrl: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        duration: uploadResult.duration,
        format: "video/webm",
        rating,
        caption,
        productTag: selectedProduct.category,
      });

      navigate("/");
    } catch {
      // Error handled by hook.
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post("/api/products", newProduct);
      setSelectedProduct(data.product);
      setShowAddProduct(false);
      setNewProduct({ name: "", brand: "", category: "" });
    } catch {
      alert("Could not add product");
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <h1 className="mb-4 text-xl font-bold">Record 5s review</h1>
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
          src={previewUrl ?? undefined}
        />
        {!previewUrl && !recording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={startRecording}>Start 5s recording</Button>
          </div>
        )}
        {recording && (
          <div className="absolute left-4 top-4 rounded-full bg-red-500 px-4 py-2 text-lg font-bold">
            {countdown}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-white/70">Product</label>
            {!selectedProduct ? (
              <>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
                />
                {products.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-auto rounded-xl bg-white/5">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setProducts([]);
                          setProductQuery("");
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-white/10"
                      >
                        {p.name} <span className="text-white/50">({p.category})</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="mt-2 text-sm text-brand-500"
                >
                  + Add new product
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2">
                <span>{selectedProduct.name}</span>
                <button onClick={() => setSelectedProduct(null)} className="text-sm text-white/50">
                  Change
                </button>
              </div>
            )}
          </div>

          {showAddProduct && (
            <form onSubmit={handleAddProduct} className="space-y-2 rounded-xl bg-white/5 p-3">
              <input
                placeholder="Product name"
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
              />
              <input
                placeholder="Brand"
                value={newProduct.brand}
                onChange={(e) => setNewProduct((p) => ({ ...p, brand: e.target.value }))}
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
              />
              <input
                placeholder="Category"
                value={newProduct.category}
                onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
              />
              <Button type="submit" className="w-full">
                Add Product
              </Button>
            </form>
          )}

          <div>
            <label className="text-sm text-white/70">Rating</label>
            <input
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-center font-bold">{rating}/10</p>
          </div>

          <input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />

          {isUploading && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-white/60">{progress}%</p>
            </div>
          )}

          <Button onClick={handleUpload} disabled={isUploading || !selectedProduct} className="w-full">
            {isUploading ? "Uploading..." : "Post review"}
          </Button>
        </div>
      )}
    </div>
  );
}
