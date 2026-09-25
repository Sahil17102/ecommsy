import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let detector: FaceDetector | null = null;
let initPromise: Promise<FaceDetector> | null = null;

/**
 * Lazily initialise MediaPipe FaceDetector (loads WASM + model once).
 * Subsequent calls return the cached instance.
 */
async function getDetector(): Promise<FaceDetector> {
  if (detector) return detector;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.6,
    });
    return detector;
  })();

  return initPromise;
}

export interface FaceValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate that a captured selfie contains exactly one, clearly visible,
 * centered face. Uses MediaPipe BlazeFace (short-range, ~100 KB model).
 */
export async function validateFace(
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  imageWidth: number,
  imageHeight: number,
): Promise<FaceValidationResult> {
  try {
    const fd = await getDetector();
    const { detections } = fd.detect(imageSource);

    if (detections.length === 0) {
      return {
        valid: false,
        reason:
          "No face detected. Please look directly at the camera with your face clearly visible.",
      };
    }

    if (detections.length > 1) {
      return {
        valid: false,
        reason:
          "Multiple faces detected. Only your face should be in the frame.",
      };
    }

    const box = detections[0].boundingBox;
    if (!box) return { valid: true };

    const faceArea = box.width * box.height;
    const imageArea = imageWidth * imageHeight;
    const faceRatio = faceArea / imageArea;

    // Face should cover at least 10% of the frame
    if (faceRatio < 0.1) {
      return {
        valid: false,
        reason:
          "Your face is too far away. Please move closer to the camera.",
      };
    }

    // Face center should be in the middle region of the image
    const faceCenterX = (box.originX + box.width / 2) / imageWidth;
    const faceCenterY = (box.originY + box.height / 2) / imageHeight;

    if (
      faceCenterX < 0.2 ||
      faceCenterX > 0.8 ||
      faceCenterY < 0.15 ||
      faceCenterY > 0.75
    ) {
      return {
        valid: false,
        reason: "Please center your face in the frame.",
      };
    }

    return { valid: true };
  } catch {
    // If detection fails for any reason, allow the image
    // (admin will review it anyway)
    return { valid: true };
  }
}
