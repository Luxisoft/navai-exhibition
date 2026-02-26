import type { CSSProperties, ImgHTMLAttributes } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  fill?: boolean;
};

export default function Image({
  src,
  alt,
  width,
  height,
  priority,
  fill,
  style,
  loading,
  ...props
}: ImageProps) {
  const resolvedStyle: CSSProperties | undefined = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }
    : style;

  return (
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : loading ?? "lazy"}
      decoding="async"
      style={resolvedStyle}
      {...props}
    />
  );
}
