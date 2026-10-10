'use client';

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
};

export default function LiderAvatar({ src, alt }: Props) {
  const [hasError, setHasError] = useState(false);

  if (hasError) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setHasError(true)}
    />
  );
}