import Image from "next/image";

/**
 * Flat placeholder render of the can. Used as the instant-paint poster while the
 * 3D chunk loads, and as the permanent fallback on small screens, reduced-motion,
 * and low-core devices.
 */
export default function StaticCanPoster({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`}>
      <Image
        src="/can-poster.png"
        alt="YEXX Energy Drink can"
        width={800}
        height={2533}
        priority
        className="h-[75%] w-auto object-contain"
      />
    </div>
  );
}
