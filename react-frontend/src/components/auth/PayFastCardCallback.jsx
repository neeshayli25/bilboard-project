import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function PayFastCardCallback() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";
  const paRes = searchParams.get("paRes") || searchParams.get("pares") || "";
  const md = searchParams.get("MD") || searchParams.get("md") || "";

  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "payfast-3ds-result",
          bookingId,
          paRes,
          md,
        },
        window.location.origin
      );
    }

    const timeoutId = window.setTimeout(() => {
      window.close();
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [bookingId, md, paRes]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-[#131A2A]/90 p-8 text-center shadow-[0_30px_100px_rgba(4,10,22,0.5)]">
        <ShieldCheck size={52} className="mx-auto text-emerald-400" />
        <h1 className="mt-5 text-2xl font-black">Secure Bank Check Complete</h1>
        <p className="mt-3 text-sm text-blue-100/65">
          Your bank finished the card security step. This window can close automatically and the booking page will finalize the payment.
        </p>
      </div>
    </div>
  );
}
