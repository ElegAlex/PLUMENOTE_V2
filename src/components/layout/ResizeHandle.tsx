"use client";

/**
 * ResizeHandle Component
 *
 * A draggable handle for resizing the sidebar width.
 * Supports mouse drag with visual feedback and respects min/max constraints.
 *
 * @see Story 5.4: Sidebar et Navigation Arborescente
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ResizeHandleProps {
  /** Callback when resize occurs with new width */
  onResize: (width: number) => void;
  /** Current width of the resizable element (used as starting point for drag) */
  currentWidth?: number;
  /** Minimum allowed width in pixels */
  minWidth?: number;
  /** Maximum allowed width in pixels */
  maxWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Draggable resize handle for sidebar width adjustment.
 */
export function ResizeHandle({
  onResize,
  currentWidth,
  minWidth = 200,
  maxWidth = 400,
  className,
}: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    // Use provided currentWidth if available, fallback to parent element measurement
    if (currentWidth !== undefined) {
      startWidthRef.current = currentWidth;
    } else {
      const sidebar = e.currentTarget.parentElement;
      if (sidebar) {
        startWidthRef.current = sidebar.getBoundingClientRect().width;
      }
    }
  }, [currentWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + delta)
      );
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize for better UX
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner la sidebar"
      tabIndex={0}
      className={cn(
        "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
        "hover:bg-primary/50 active:bg-primary",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isResizing && "bg-primary",
        className
      )}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        // Keyboard support for accessibility
        // Use currentWidth prop if available, fallback to DOM measurement
        const getWidth = () => {
          if (currentWidth !== undefined) return currentWidth;
          const sidebar = e.currentTarget.parentElement;
          return sidebar ? sidebar.getBoundingClientRect().width : minWidth;
        };

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onResize(Math.max(minWidth, getWidth() - 10));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onResize(Math.min(maxWidth, getWidth() + 10));
        }
      }}
    />
  );
}
