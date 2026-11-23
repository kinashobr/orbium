import { cn } from "@/lib/utils";

interface CloudSyncIconProps {
  size?: number | string;
  className?: string;
  isAnimating?: boolean;
  strokeWidth?: number;
}

export function AnimatedCloudUpload({
  size = 16,
  className,
  isAnimating = false,
  strokeWidth = 2,
}: CloudSyncIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <path
        d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
        className={cn(isAnimating && "animate-cloud-breathe")}
      />
      <g className={cn(isAnimating && "animate-cloud-upload-arrow")}>
        <path d="M12 13v8" />
        <path d="m8 17 4-4 4 4" />
      </g>
    </svg>
  );
}

export function AnimatedCloudDownload({
  size = 16,
  className,
  isAnimating = false,
  strokeWidth = 2,
}: CloudSyncIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <path
        d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"
        className={cn(isAnimating && "animate-cloud-breathe")}
      />
      <g className={cn(isAnimating && "animate-cloud-download-arrow")}>
        <path d="M12 13v8l-4-4" />
        <path d="m12 21 4-4" />
      </g>
    </svg>
  );
}
