"use client";

import type * as FaceAPI from "@vladmandic/face-api";

/**
 * Face detection and embedding, entirely in the browser.
 *
 * Nothing here uploads an image. A class photograph is decoded, measured and
 * discarded on the device; only the resulting 128-number descriptors travel to
 * the server. That is what makes photographing children defensible.
 */

const MODEL_URL = "/models";

let api: typeof FaceAPI | null = null;
let loading: Promise<typeof FaceAPI> | null = null;

export type LoadStage = "idle" | "downloading" | "ready" | "error";

export async function loadFaceApi(onStage?: (s: LoadStage) => void): Promise<typeof FaceAPI> {
  if (api) return api;
  if (loading) return loading;

  onStage?.("downloading");
  loading = (async () => {
    const faceapi = await import("@vladmandic/face-api");

    // WebGL where available; the CPU backend keeps a weak device working, slowly.
    // face-api re-exports tfjs without its full type surface, hence the cast.
    const tf = faceapi.tf as unknown as {
      setBackend(name: string): Promise<boolean>;
      ready(): Promise<void>;
    };
    try {
      await tf.setBackend("webgl");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    api = faceapi;
    onStage?.("ready");
    return faceapi;
  })();

  try {
    return await loading;
  } catch (err) {
    loading = null;
    onStage?.("error");
    throw err;
  }
}

export interface DetectedFace {
  /** Index within this photograph. */
  index: number;
  box: { x: number; y: number; width: number; height: number };
  descriptor: number[];
  score: number;
  /** Data URL of just this face, for the "who is this?" step. */
  thumbnail: string;
}

type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

/** Detects every face in one image and returns descriptors plus crops. */
export async function detectFaces(
  input: ImageSource,
  minConfidence = 0.35,
): Promise<DetectedFace[]> {
  const faceapi = await loadFaceApi();

  const results = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r, index) => ({
    index,
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    },
    descriptor: Array.from(r.descriptor),
    score: r.detection.score,
    thumbnail: cropToDataUrl(input, r.detection.box),
  }));
}

/** Detects the single most prominent face — used when enrolling one child. */
export async function detectOneFace(input: ImageSource): Promise<DetectedFace | null> {
  const faces = await detectFaces(input, 0.3);
  if (!faces.length) return null;
  return faces.reduce((a, b) => (a.box.width * a.box.height >= b.box.width * b.box.height ? a : b));
}

function cropToDataUrl(
  input: ImageSource,
  box: { x: number; y: number; width: number; height: number },
): string {
  // A little padding keeps hair and chin in frame, which makes the crop
  // recognisable to the volunteer who has to name it.
  const pad = box.width * 0.25;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(
    input,
    Math.max(0, box.x - pad),
    Math.max(0, box.y - pad),
    box.width + pad * 2,
    box.height + pad * 2,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.7);
}

/** Reads a File into an <img> sized down so detection stays fast on a phone. */
export function fileToImage(file: File, maxEdge = 1280): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      if (scale === 1) {
        URL.revokeObjectURL(url);
        resolve(img);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const scaled = new Image();
      scaled.onload = () => {
        URL.revokeObjectURL(url);
        resolve(scaled);
      };
      scaled.src = canvas.toDataURL("image/jpeg", 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

/** Current position, or null if the browser or the user declines. */
export function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
