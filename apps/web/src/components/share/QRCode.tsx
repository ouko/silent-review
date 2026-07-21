import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 128, className }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCodeLib.toDataURL(value, { width: size, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [value, size]);

  if (!dataUrl) {
    return <div className={`bg-white/10 ${className}`} style={{ width: size, height: size }} />;
  }

  return <img src={dataUrl} alt="QR code" className={className} style={{ width: size, height: size }} />;
}
