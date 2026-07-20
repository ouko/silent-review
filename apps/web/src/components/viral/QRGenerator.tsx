import { useState } from "react";

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
  const qrSvg = `
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
  `;

  const blob = new Blob([qrSvg], { type: "image/svg+xml" });
  const src = URL.createObjectURL(blob);

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <h3 className="font-bold">{productName ? `QR for ${productName}` : "Share Silent Review"}</h3>
      <img src={src} alt="QR code" className="rounded-xl bg-white p-2" width={size} height={size} />
      <p className="text-center text-xs text-white/50">{url}</p>
    </div>
  );
}
