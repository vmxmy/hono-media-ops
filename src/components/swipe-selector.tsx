"use client";

import { useState, useCallback, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import Image from "next/image";

interface SwipeSelectorItem {
  id: string;
  name: string;
  subtitle?: string;
  meta?: string;
  linkUrl?: string;
  previewUrl?: string;
  similarity?: number;
}

interface SwipeSelectorProps {
  items: SwipeSelectorItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
  variant?: "default" | "record";
  labels?: {
    swipeHint?: string;
    noPreview?: string;
    matchSuffix?: string;
  };
}

export function SwipeSelector({
  items,
  selectedId,
  onSelect,
  title,
  variant = "default",
  labels,
}: SwipeSelectorProps) {
  const {
    swipeHint = "← 滑动 →",
    noPreview = "无预览",
    matchSuffix = "% 匹配",
  } = labels ?? {};

  const currentIndex = items.findIndex((item) => item.id === selectedId);
  const [displayIndex, setDisplayIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setDisplayIndex(clampedIndex);
      setIsDetailsOpen(false);
      const item = items[clampedIndex];
      if (item) {
        onSelect(item.id);
      }
    },
    [items, onSelect]
  );

  const handlers = useSwipeable({
    onSwipedLeft: () => goTo(displayIndex + 1),
    onSwipedRight: () => goTo(displayIndex - 1),
    trackMouse: true,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goTo(displayIndex - 1);
      } else if (event.key === "ArrowRight") {
        goTo(displayIndex + 1);
      }
    },
    [displayIndex, goTo]
  );

  const currentItem = items[displayIndex];
  const isRecord = variant === "record";
  const showMobileDetails = isRecord && isMobile && isDetailsOpen;
  const hasMobileDetails = Boolean(currentItem?.subtitle || currentItem?.meta);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };
    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    setIsDetailsOpen(false);
  }, [displayIndex, items.length]);

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">
        {title} {swipeHint}
      </p>

      <div
        {...handlers}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="listbox"
        aria-label={title}
        className={
          isRecord
            ? "relative w-full max-w-sm aspect-square rounded-full overflow-hidden touch-pan-y bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
            : "relative w-full max-w-sm aspect-square bg-gray-100 rounded-lg overflow-hidden touch-pan-y"
        }
      >
        {isRecord && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),rgba(255,255,255,0)_45%)]" />
            <div className="absolute inset-6 rounded-full border border-white/50" />
            <div className="absolute inset-10 rounded-full border border-white/30" />
          </>
        )}
        {currentItem.previewUrl ? (
          <Image
            src={currentItem.previewUrl}
            alt={currentItem.name}
            fill
            className={isRecord ? "object-cover rounded-full" : "object-cover"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {noPreview}
          </div>
        )}
        {isRecord && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-white/80 shadow-inner" />
          </div>
        )}
      </div>

      <div className="text-center">
        {isRecord && isMobile ? (
          currentItem.linkUrl ? (
            <a
              className="font-medium text-blue-600 hover:text-blue-700"
              href={currentItem.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {currentItem.name}
            </a>
          ) : (
            <p className="font-medium">{currentItem.name}</p>
          )
        ) : (
          <p className="font-medium">{currentItem.name}</p>
        )}
        {!isRecord || !isMobile ? (
          <>
            {currentItem.subtitle && (
              <p className="text-sm text-gray-500">{currentItem.subtitle}</p>
            )}
            {currentItem.meta && (
              <p className="text-xs text-gray-400">{currentItem.meta}</p>
            )}
          </>
        ) : null}
        {!isRecord || !isMobile ? (
          currentItem.similarity !== undefined && (
            <p className="text-sm text-gray-500">{currentItem.similarity}{matchSuffix}</p>
          )
        ) : null}
        {isRecord && isMobile && hasMobileDetails && (
          <button
            type="button"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            {isDetailsOpen ? "收起" : "更多信息"}
          </button>
        )}
      </div>

      {showMobileDetails && (
        <div className="text-center text-xs text-gray-500 transition-opacity">
          {currentItem.subtitle && (
            <p>{currentItem.subtitle}</p>
          )}
          {currentItem.meta && (
            <p className="text-gray-400">{currentItem.meta}</p>
          )}
        </div>
      )}

      {/* 圆点指示器 */}
      <div className="flex gap-1">
        {items.slice(0, 10).map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === displayIndex ? "bg-blue-500" : "bg-gray-300"
            }`}
          />
        ))}
        {items.length > 10 && (
          <span className="text-xs text-gray-400 ml-1">
            +{items.length - 10}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {displayIndex + 1} / {items.length}
      </p>
    </div>
  );
}
