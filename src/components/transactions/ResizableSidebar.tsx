import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResizableSidebarProps {
  children: ReactNode;
  minWidth?: number;
  maxWidth?: number;
  storageKey: string;
  initialWidth: number;
}

export function ResizableSidebar({
  children,
  minWidth = 200,
  maxWidth = 400,
  storageKey,
  initialWidth,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey);
      return savedWidth ? Math.min(maxWidth, Math.max(minWidth, parseInt(savedWidth))) : initialWidth;
    }
    return initialWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    localStorage.setItem(storageKey, width.toString());
  }, [width, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX.current;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
    setWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      style={{ width: `${width}px` }}
      className={cn(
        "shrink-0 relative h-full flex flex-col",
        isResizing && "transition-none"
      )}
    >
      {children}
      
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-50 transition-colors hover:bg-primary/20"
        onMouseDown={handleMouseDown}
        title="Arraste para redimensionar"
      />
    </div>
  );
}