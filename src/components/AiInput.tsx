"use client";

import { useState, useRef } from "react";
import { Camera, Send, Loader2, ImageIcon, X } from "lucide-react";

interface AiInputProps {
  onSubmit: (text: string, imageBase64?: string, imageMime?: string) => Promise<void>;
  loading: boolean;
}

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      resolve({ base64: dataUrl.split(",")[1], mime: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function AiInput({ onSubmit, loading }: AiInputProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      const { base64, mime } = await compressImage(file);
      setImage(base64);
      setImageMime(mime);
      setPreview(`data:${mime};base64,${base64}`);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImage(result.split(",")[1]);
        setImageMime(file.type || "image/jpeg");
        setPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setImage(null);
    setImageMime(null);
    setPreview(null);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) return;
    await onSubmit(text.trim(), image || undefined, imageMime || undefined);
    setText("");
    clearImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800/50 overflow-hidden">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCamera}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleGallery}
        className="hidden"
      />
      {preview && (
        <div className="relative p-2">
          <img
            src={preview}
            alt="Aperçu"
            className="w-full h-32 object-cover rounded-lg"
          />
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 bg-slate-900/80 rounded-full p-1.5 text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1 p-3">
        <button
          onClick={() => cameraRef.current?.click()}
          className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
          title="Prendre une photo"
        >
          <Camera size={20} />
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
          title="Galerie"
        >
          <ImageIcon size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Décris ton repas..."
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none py-2 max-h-20 ml-1"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || (!text.trim() && !image)}
          className="p-2 text-emerald-500 disabled:text-slate-600 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
