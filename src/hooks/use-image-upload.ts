"use client"

/**
 * Image Upload Hook
 *
 * Provides image upload functionality with presigned URLs.
 * Handles validation, progress tracking, and error states.
 */

import { useState, useCallback } from "react"
import { api } from "@/trpc/react"
import {
  compressImage,
  type CompressOptions,
  type CompressionResult,
} from "@/lib/image/compress"

// ==================== Types ====================

export type UploadStatus =
  | "idle"
  | "compressing"
  | "getting-url"
  | "uploading"
  | "completed"
  | "error"

export interface UploadProgress {
  status: UploadStatus
  progress: number // 0-100
  error?: string
  /** Compression result (if compression was applied) */
  compression?: CompressionResult
}

export interface UploadResult {
  publicUrl: string
  key: string
}

export interface UseImageUploadOptions {
  /** Storage folder for uploads (default: "uploads/images") */
  folder?: string
  /**
   * Enable image compression before upload
   * - true: use default compression settings (2MB max, 1920px max dimension)
   * - CompressOptions: use custom compression settings
   * - false/undefined: no compression
   * Default: true (compression enabled)
   */
  compress?: boolean | CompressOptions
  /** Callback when upload completes successfully */
  onUploadComplete?: (result: UploadResult) => void
  /** Callback when upload fails */
  onError?: (error: Error) => void
}

// ==================== Constants ====================

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]

// ==================== Hook ====================

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
  })

  const getPresignedUrlMutation = api.uploads.getPresignedUrl.useMutation()

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`
    }
    return null
  }, [])

  /**
   * Upload an image file
   * Returns the public URL and storage key on success, null on failure
   */
  const uploadImage = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        setUploadProgress({ status: "error", progress: 0, error: validationError })
        options.onError?.(new Error(validationError))
        return null
      }

      let fileToUpload = file
      let compressionResult: CompressionResult | undefined

      try {
        // Step 0: Compress image if enabled (default: true)
        const shouldCompress = options.compress !== false
        if (shouldCompress) {
          setUploadProgress({ status: "compressing", progress: 5 })

          const compressOptions =
            typeof options.compress === "object" ? options.compress : undefined

          compressionResult = await compressImage(file, compressOptions)
          fileToUpload = compressionResult.file
        }

        // Step 1: Get presigned URL from server
        setUploadProgress({
          status: "getting-url",
          progress: 10,
          compression: compressionResult,
        })

        const { uploadUrl, publicUrl, key } = await getPresignedUrlMutation.mutateAsync({
          filename: fileToUpload.name,
          contentType: fileToUpload.type,
          folder: options.folder,
        })

        // Step 2: Check if this is a local upload (URL starts with /)
        const isLocalUpload = uploadUrl.startsWith("/")

        if (isLocalUpload) {
          // Local storage: use FormData upload to our API route
          setUploadProgress({
            status: "uploading",
            progress: 30,
            compression: compressionResult,
          })

          const formData = new FormData()
          formData.append("file", fileToUpload)

          const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Local upload failed: ${response.statusText}`)
          }

          setUploadProgress({
            status: "completed",
            progress: 100,
            compression: compressionResult,
          })
          const result = { publicUrl, key }
          options.onUploadComplete?.(result)
          return result
        }

        // Step 3: Direct upload to cloud storage (R2/S3)
        setUploadProgress({
          status: "uploading",
          progress: 30,
          compression: compressionResult,
        })

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              // Map upload progress from 30% to 90%
              const percentComplete = 30 + (event.loaded / event.total) * 60
              setUploadProgress({
                status: "uploading",
                progress: Math.round(percentComplete),
                compression: compressionResult,
              })
            }
          })

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
            }
          })

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"))
          })

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload aborted"))
          })

          xhr.open("PUT", uploadUrl)
          xhr.setRequestHeader("Content-Type", fileToUpload.type)
          xhr.send(fileToUpload)
        })

        // Step 4: Complete
        setUploadProgress({
          status: "completed",
          progress: 100,
          compression: compressionResult,
        })

        const result = { publicUrl, key }
        options.onUploadComplete?.(result)

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed"
        setUploadProgress({ status: "error", progress: 0, error: errorMessage })
        options.onError?.(error instanceof Error ? error : new Error(errorMessage))
        return null
      }
    },
    [getPresignedUrlMutation, options, validateFile]
  )

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setUploadProgress({ status: "idle", progress: 0 })
  }, [])

  return {
    uploadImage,
    uploadProgress,
    reset,
    isUploading:
      uploadProgress.status === "compressing" ||
      uploadProgress.status === "getting-url" ||
      uploadProgress.status === "uploading",
    isCompressing: uploadProgress.status === "compressing",
    isError: uploadProgress.status === "error",
    isCompleted: uploadProgress.status === "completed",
  }
}
