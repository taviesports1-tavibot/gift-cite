"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

export function GiftThumbnail({ image, name, size = 38 }: { image?: string; name: string; size?: number }) {
  const [failedImage, setFailedImage] = useState<string>();
  const showImage = Boolean(image && failedImage !== image);

  return <span className="gift-thumbnail" style={{ width: size, height: size }} title={`TikTok Gift: ${name}`}>
    <Gift className="gift-thumbnail-fallback" aria-hidden="true" />
    {/* eslint-disable-next-line @next/next/no-img-element -- TikTok catalog CDN hosts are dynamic and provider-controlled. */}
    {showImage && <img src={image} alt={`TikTok Gift ${name}`} referrerPolicy="no-referrer" loading="eager" onError={() => setFailedImage(image)} />}
  </span>;
}
