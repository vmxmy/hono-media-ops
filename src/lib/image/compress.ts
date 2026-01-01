/**
 * Browser-side Image Compression Utility
 *
 * Uses browser-image-compression for client-side image optimization.
 * Recommended for WeChat Official Account (max 2MB per image).
 */

import imageCompression from "browser-image-compression"

// ==================== Types ====================

export interface CompressOptions {
  /** Maximum file size in MB (default: 2MB for WeChat compatibility) */
  maxSizeMB?: number
  /** Maximum width or height in pixels (default: 1920px) */
  maxWidthOrHeight?: number
  /** Use web worker for compression (default: true) */
  useWebWorker?: boolean
  /** Preserve EXIF metadata (default: false) */
  preserveExif?: boolean
  /** Output format - undefined means preserve original format */
  fileType?: "image/jpeg" | "image/png" | "image/webp"
}

export interface CompressionResult {
  /** Compressed file */
  file: File
  /** Original file size in bytes */
  originalSize: number
  /** Compressed file size in bytes */
  compressedSize: number
  /** Compression ratio (0-1, lower = more compressed) */
  ratio: number
  /** Whether compression was applied (false if file was already small enough) */
  wasCompressed: boolean
}

// ==================== Constants ====================

const DEFAULT_OPTIONS: Required<Omit<CompressOptions, "fileType">> = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: false,
}

/** File types that can be compressed */
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Minimum file size to consider for compression (100KB) */
const MIN_SIZE_FOR_COMPRESSION = 100 * 1024

// ==================== Functions ====================

/**
 * Check if a file can be compressed
 */
export function canCompress(file: File): boolean {
  return COMPRESSIBLE_TYPES.includes(file.type)
}

/**
 * Check if a file should be compressed (based on size threshold)
 */
export function shouldCompress(file: File, maxSizeMB: number = DEFAULT_OPTIONS.maxSizeMB): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return canCompress(file) && file.size > maxSizeBytes
}

/**
 * Compress an image file
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compression result with the compressed file and metadata
 *
 * @example
 * ```ts
 * const result = await compressImage(file, { maxSizeMB: 1 })
 * console.log(`Compressed from ${result.originalSize} to ${result.compressedSize}`)
 * ```
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<CompressionResult> {
  const originalSize = file.size

  // Skip compression for non-compressible types (SVG, GIF)
  if (!canCompress(file)) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      wasCompressed: false,
    }
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  const maxSizeBytes = mergedOptions.maxSizeMB * 1024 * 1024

  // Skip compression if file is already small enough
  if (file.size <= maxSizeBytes && file.size < MIN_SIZE_FOR_COMPRESSION) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      wasCompressed: false,
    }
  }

  // Determine output format
  let outputFileType = options?.fileType
  if (!outputFileType) {
    // Keep original format for PNG if it's small, otherwise convert to JPEG
    if (file.type === "image/png" && file.size <= maxSizeBytes) {
      outputFileType = "image/png"
    } else if (file.type === "image/webp") {
      outputFileType = "image/webp"
    } else {
      // Default to JPEG for better compression
      outputFileType = "image/jpeg"
    }
  }

  const compressedFile = await imageCompression(file, {
    maxSizeMB: mergedOptions.maxSizeMB,
    maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
    useWebWorker: mergedOptions.useWebWorker,
    preserveExif: mergedOptions.preserveExif,
    fileType: outputFileType,
  })

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    ratio: compressedFile.size / originalSize,
    wasCompressed: true,
  }
}

/**
 * Compress multiple images in parallel
 *
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Array of compression results
 */
export async function compressImages(
  files: File[],
  options?: CompressOptions
): Promise<CompressionResult[]> {
  return Promise.all(files.map((file) => compressImage(file, options)))
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get compression summary for display
 */
export function getCompressionSummary(result: CompressionResult): string {
  if (!result.wasCompressed) {
    return `No compression needed (${formatFileSize(result.originalSize)})`
  }

  const savedBytes = result.originalSize - result.compressedSize
  const savedPercent = ((1 - result.ratio) * 100).toFixed(0)

  return `Compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (saved ${savedPercent}%)`
}
