import { useEffect, useRef, useState } from "react";

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  width?: number;
  height?: number;
};

type ImageState = "loading" | "loaded" | "error";

export function ProductImage({
  src,
  alt,
  className = "h-full w-full object-cover",
  loading = "lazy",
  fetchPriority = "auto",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  width = 1024,
  height = 1280,
}: ProductImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<ImageState>(src ? "loading" : "error");

  useEffect(() => {
    setState(src ? "loading" : "error");

    const image = imageRef.current;
    if (!image || !src || !image.complete) return;

    setState(image.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  if (!src || state === "error") {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full items-center justify-center bg-muted px-4 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
      >
        Image unavailable
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted" aria-busy={state === "loading"}>
      {state === "loading" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-linear-to-br from-muted via-card to-muted"
        />
      )}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={`${className} ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
