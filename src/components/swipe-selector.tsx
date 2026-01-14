"use client";

import { useState, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import Image from "next/image";

interface SwipeSelectorItem {
  id: string;
  name: string;
  previewUrl?: string;
  similarity?: number;
}

interface SwipeSelectorProps {
  items: SwipeSelectorItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  title: string;
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

  const goTo = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setDisplayIndex(clampedIndex);
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
        className="relative w-full max-w-sm aspect-square bg-gray-100 rounded-lg overflow-hidden touch-pan-y"
      >
        {currentItem.previewUrl ? (
          <Image
            src={currentItem.previewUrl}
            alt={currentItem.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {noPreview}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-medium">{currentItem.name}</p>
        {currentItem.similarity !== undefined && (
          <p className="text-sm text-gray-500">{currentItem.similarity}{matchSuffix}</p>
        )}
      </div>

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
