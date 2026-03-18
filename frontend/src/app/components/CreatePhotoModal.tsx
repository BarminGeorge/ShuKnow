import { useState, useRef } from "react";
import { X, Image as ImageIcon, Upload } from "lucide-react";

interface CreatePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, imageUrl: string, prompt: string) => void;
}

export function CreatePhotoModal({
  isOpen,
  onClose,
  onCreate,
}: CreatePhotoModalProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set name from file if not already set
    if (!name) {
      setName(file.name);
    }

    // Read file as data URL for preview and storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
      setPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!name.trim() || !imageUrl) return;
    onCreate(name.trim(), imageUrl, prompt.trim());
    // Reset for next time
    setName("");
    setImageUrl("");
    setPreviewUrl("");
    setPrompt("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <ImageIcon size={16} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white flex-1">Загрузить фото</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Image Upload Area */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">
              Фото
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-white/20 rounded-lg p-6 cursor-pointer hover:border-white/40 transition-colors flex flex-col items-center justify-center"
            >
              {previewUrl ? (
                <div className="w-full">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-48 object-contain rounded mb-3"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageUrl("");
                      setPreviewUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded transition-colors"
                  >
                    Удалить фото
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-gray-500 mb-3" />
                  <p className="text-sm text-gray-300 text-center">
                    Нажмите чтобы выбрать фото или перетащите его сюда
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WebP до 10МБ
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* File Name */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Название файла
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                onKeyDown={handleKeyDown}
                placeholder="Название фото"
                maxLength={50}
                className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:border-blue-500/50 transition-colors pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {name.length}/50
              </span>
            </div>
          </div>

          {/* AI Prompt */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Инструкция для ИИ
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим фото..."
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 resize-none outline-none focus:border-blue-500/50 transition-colors"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !imageUrl}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            Загрузить
          </button>
        </div>
      </div>
    </div>
  );
}
