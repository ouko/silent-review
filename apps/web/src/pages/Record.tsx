import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";

export function Record() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [caption, setCaption] = useState("");
  const [productTag, setProductTag] = useState("");
  const [uploading, setUploading] = useState(false);

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
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
      setRecording(false);
    }, 5000);
  }

  async function handleUpload() {
    const blob = mediaRef.current;
    if (!blob) return;
    setUploading(true);
    try {
      const { data } = await api.post("/api/upload/presigned", {
        contentType: "video/webm",
        size: blob.size,
      });

      const formData = new FormData();
      Object.entries(data.fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append("file", blob);
      await fetch(data.url, { method: "POST", body: formData });

      await api.post("/api/reviews", {
        videoUrl: data.cloudFrontUrl,
        rating,
        caption,
        productTag,
      });

      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
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
          <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold">
            REC
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 space-y-3">
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
            placeholder="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <input
            placeholder="Product tag"
            value={productTag}
            onChange={(e) => setProductTag(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/40"
          />
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Post review"}
          </Button>
        </div>
      )}
    </div>
  );
}
