"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { DialogContent } from "./dialog";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ResizableDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  storageKey: string;
  initialWidth: number;
  initialHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  hideCloseButton?: boolean;
}

export const ResizableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  ResizableDialogContentProps
>(({ 
  storageKey, 
  initialWidth, 
  initialHeight, 
  minWidth = 400, 
  minHeight = 300, 
  maxWidth = 2000,
  maxHeight = 1500,
  hideCloseButton = false,
  className, 
  children, 
  ...props 
}, ref) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  
  const [size, setSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            width: Math.min(maxWidth, Math.max(minWidth, parsed.width)),
            height: Math.min(maxHeight, Math.max(minHeight, parsed.height))
          };
        } catch (e) {
          return { width: initialWidth, height: initialHeight };
        }
      }
    }
    return { width: initialWidth, height: initialHeight };
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(storageKey, JSON.stringify(size));
    }
  }, [size, storageKey, isMobile]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile || isTablet) return; // Desabilitar resize em mobile/tablet
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size, isMobile, isTablet]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;

    const deltaX = e.clientX - resizeRef.current.startX;
    const deltaY = e.clientY - resizeRef.current.startY;

    const newWidth = Math.min(maxWidth, Math.max(minWidth, resizeRef.current.startWidth + deltaX * 2));
    const newHeight = Math.min(maxHeight, Math.max(minHeight, resizeRef.current.startHeight + deltaY * 2));

    setSize({
      width: newWidth,
      height: newHeight,
    });
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight]);

  const onMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, onMouseMove, onMouseUp]);

  // Estilos responsivos
  const responsiveStyles = isMobile
    ? {
        width: '100%',
        height: 'auto',
        maxWidth: '95vw',
        maxHeight: '85vh',
      }
    : isTablet
    ? {
        width: `${Math.min(size.width, window.innerWidth * 0.9)}px`,
        height: `${Math.min(size.height, window.innerHeight * 0.85)}px`,
        maxWidth: '90vw',
        maxHeight: '85vh',
      }
    : {
        width: `${size.width}px`,
        height: `${size.height}px`,
        maxWidth: '95vw',
        maxHeight: '95vh',
      };

  return (
    <DialogContent
      ref={ref}
      className={cn("p-0 overflow-hidden flex flex-col", className)}
      style={responsiveStyles}
      hideCloseButton={hideCloseButton}
      {...props}
    >
      {children}
      
      {/* Resizer handle (Bottom Right) - Hidden on mobile/tablet */}
      {!isMobile && !isTablet && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[100] group"
          onMouseDown={onMouseDown}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
        </div>
      )}
    </DialogContent>
  );
});

ResizableDialogContent.displayName = "ResizableDialogContent";