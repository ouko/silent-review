import { useState, useMemo } from "react";
import { QrCode } from "lucide-react";

interface QRGeneratorProps {
  productId?: string;
  productName?: string;
}

export function QRGenerator({ productId, productName }: QRGeneratorProps) {
  const [size] = useState(200);
  const url = productId
    ? `${window.location.origin}/product/${productId}`
    : window.location.origin;

  // Simple SVG-based QR placeholder. In production, use a QR library.
  const qrSvg = useMemo(
    () => `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="white"/>
      <rect x="10" y="10" width="25" height="25" fill="black"/>
      <rect x="65" y="10" width="25" height="25" fill="black"/>
      <rect x="10" y="65" width="25" height="25" fill="black"/>
      <rect x="40" y="40" width="20" height="20" fill="black"/>
      <rect x="20" y="45" width="10" height="10" fill="black"/>
      <rect x="70" y="45" width="10" height="10" fill="black"/>
      <rect x="45" y="70" width="10" height="10" fill="black"/>
      <rect x="75" y="75" width="10" height="10" fill="black"/>
    </svg>
  `,
    [size]
  );

  const src = useMemo(() => {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  }, [qrSvg]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <QrCode className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">
            {productName ? `QR for ${productName}` : "Share Silent Review"}
          </h3>
          <p className="text-xs text-white/50">Scan to open the app</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-[0_0_24px_rgba(139,92,246,0.25)]">
          <img src={src} alt="QR code" width={size} height={size} />
        </div>
        <p className="max-w-[260px] break-all text-center text-[10px] font-medium uppercase tracking-wider text-white/40">
          {url}
        </p>
      </div>
    </section>
  );
}
