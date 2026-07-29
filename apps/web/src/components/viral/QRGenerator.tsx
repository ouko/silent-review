import { QRCode } from "../share/QRCode";
import { QrCode } from "lucide-react";

interface QRGeneratorProps {
  productId?: string;
  productName?: string;
}

export function QRGenerator({ productId, productName }: QRGeneratorProps) {
  const url = productId
    ? `${window.location.origin}/product/${productId}`
    : window.location.origin;

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
          <QRCode value={url} size={180} className="rounded-lg" />
        </div>
        <p className="max-w-[260px] break-all text-center text-[10px] font-medium uppercase tracking-wider text-white/40">
          {url}
        </p>
      </div>
    </section>
  );
}
