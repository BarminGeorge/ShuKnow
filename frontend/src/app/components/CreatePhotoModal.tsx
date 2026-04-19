import { useState, useRef } from "react";
import { X, Image as ImageIcon, Upload } from "lucide-react";

interface CreatePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, imageUrl: string, description: string) => void;
}

export function CreatePhotoModal({
  isOpen,
  onClose,
  onCreate,
}: CreatePhotoModalProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name) {
      setName(file.name);
    }
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
    onCreate(name.trim(), imageUrl, description.trim());
    setName("");
    setImageUrl("");
    setPreviewUrl("");
    setDescription("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0d0d0d] shadow-[0_24px_80px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.07]">
          <div className="w-8 h-8 rounded-lg bg-sky-500/12 border border-sky-200/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <ImageIcon size={16} className="text-sky-300/70" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100 flex-1">Загрузить фото</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">
              Фото
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border border-dashed border-white/[0.12] bg-white/[0.018] rounded-lg p-6 cursor-pointer hover:border-white/22 hover:bg-white/[0.03] transition-colors flex flex-col items-center justify-center"
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.42)_58%,rgba(167,139,250,0.07))] border border-violet-200/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/26 hover:text-white hover:bg-violet-950/20"
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
                className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {name.length}/50
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Описание / Инструкция для ИИ
              <span className="text-gray-500 font-normal ml-1">(необязательно)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите, как ИИ должен работать с этим фото..."
              className="w-full px-4 py-3 bg-white/[0.025] border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder:text-gray-600 resize-none outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] focus:border-violet-200/18 focus:bg-white/[0.035] transition-colors"
              rows={3}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 bg-white/[0.01]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.055] hover:text-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !imageUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),rgba(15,23,42,0.42)_58%,rgba(167,139,250,0.07))] border border-violet-200/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] hover:border-violet-200/26 hover:text-white hover:bg-violet-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Загрузить
          </button>
        </div>
      </div>
    </div>
  );
}
