import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import UndiscoveredAvatar from "./UndiscoveredAvatar";
import { processImageFile, validateImageFile } from "../utils/imageUpload";

interface PhotoImporterProps {
  currentPhoto?: string | null;
  name?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  className?: string;
}

export default function PhotoImporter({
  currentPhoto,
  name,
  onPhotoUploaded,
  className = "",
}: PhotoImporterProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhoto = Boolean(
    currentPhoto &&
    currentPhoto.trim().length > 0 &&
    !currentPhoto.includes("undiscovered-placeholder") &&
    !currentPhoto.includes("Default-Icon.jpg")
  );

  const handleFileProcess = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Please select a valid image.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await processImageFile(file);
      setIsUploading(false);
      onPhotoUploaded(result.dataUrl);
    } catch (err) {
      setIsUploading(false);
      setError((err as Error)?.message || "Failed to process image file. Please try again.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileProcess(file);
    // Reset file input so selecting the same file again triggers change event
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop support per usability guidelines
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setError("Please enter a valid https:// image link.");
      return;
    }
    setError(null);
    setShowUrlInput(false);
    setCustomUrl("");
    onPhotoUploaded(trimmed);
  };

  const triggerSelect = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        id="profile-photo-file-input"
        aria-label="Upload profile photo file"
      />

      {/* Undiscovered state / Importer container */}
      {!hasPhoto ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isDragging
              ? "bg-brand-light/70 border-brand scale-[1.01]"
              : "bg-sand/30 border-mist hover:border-pebble"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <UndiscoveredAvatar photo="" name={name} size="lg" showBadge />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-clay">Photo Undiscovered</span>
                <span className="text-[11px] bg-clay/10 text-clay px-2 py-0.5 rounded-full font-medium">Initial state</span>
              </div>
              <p className="text-xs text-stone mt-1 max-w-sm leading-relaxed">
                Drag and drop your photo here or click to browse. Max 10MB (JPG, PNG, WEBP).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-import-profile-photo"
              onClick={triggerSelect}
              disabled={isUploading}
              className="flex-1 sm:flex-initial bg-brand text-ivory text-xs font-medium px-4 py-2.5 rounded-full hover:bg-brand-hover transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Select Image</span>
                </>
              )}
            </button>
            <button
              type="button"
              id="btn-toggle-photo-url-input"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-stone hover:text-charcoal px-3 py-2 rounded-full border border-mist bg-white hover:bg-cream transition-colors cursor-pointer"
              title="Enter an image web link instead"
            >
              URL
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex items-center justify-between gap-3 text-xs bg-white border rounded-xl p-3.5 transition-colors ${
            isDragging ? "border-brand bg-brand-light/30" : "border-mist"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-mist shrink-0">
              <img src={currentPhoto || ""} alt={name || "Profile"} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-medium text-charcoal">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" fill="#2A4A1E" />
                  <path d="M3.5 6l2 2 3-3" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Photo uploaded and active</span>
              </div>
              <p className="text-[11px] text-stone">Saved to your permanent profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-replace-photo"
              onClick={triggerSelect}
              disabled={isUploading}
              className="text-xs text-brand hover:underline font-medium cursor-pointer"
            >
              {isUploading ? "Uploading…" : "Replace"}
            </button>
            <span className="text-pebble">·</span>
            <button
              type="button"
              id="btn-remove-photo"
              onClick={() => onPhotoUploaded("")}
              className="text-xs text-danger/80 hover:text-danger hover:underline cursor-pointer"
            >
              Use default DP
            </button>
          </div>
        </div>
      )}

      {/* URL Input collapse */}
      {showUrlInput && (
        <form onSubmit={handleUrlSubmit} className="flex gap-2 items-center bg-white border border-mist p-2.5 rounded-xl">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Paste image link (https://...)"
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-ivory border border-mist focus:outline-none focus:border-brand text-charcoal placeholder-stone"
          />
          <button
            type="submit"
            className="bg-brand text-ivory text-xs px-3 py-2 rounded-lg hover:bg-brand-hover font-medium cursor-pointer"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="text-xs text-stone hover:text-charcoal px-2 py-2 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Error alert */}
      {error && (
        <div role="alert" className="text-xs text-danger bg-danger/10 border border-danger/20 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
