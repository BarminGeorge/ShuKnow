import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

interface EmojiEntry {
  e: string;
  k: string; // space-separated keywords in Russian
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: EmojiEntry[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Смайлы",
    icon: "😊",
    emojis: [
      { e: "😀", k: "улыбка счастье радость смайл весёлый" },
      { e: "😊", k: "улыбка мягкий счастье смайл" },
      { e: "😂", k: "смех хохот слёзы юмор ржу" },
      { e: "🥰", k: "любовь сердца влюблённость нежность" },
      { e: "😎", k: "круто солнечные очки стиль" },
      { e: "🤔", k: "думать размышление вопрос идея" },
      { e: "😴", k: "сон усталость zzz отдых дрёма" },
      { e: "🤗", k: "обнимать радость тепло привет объятие" },
      { e: "😅", k: "пот нервный облегчение неловко" },
      { e: "🙃", k: "перевёрнутый ирония сарказм" },
      { e: "🤩", k: "восхищение звёзды wow восторг" },
      { e: "🥳", k: "праздник вечеринка день рождения" },
      { e: "😢", k: "плач грусть слёзы горе печаль" },
      { e: "😡", k: "злость гнев раздражение сердитый" },
      { e: "🤯", k: "взрыв мозга шок удивление" },
      { e: "🤑", k: "деньги богатство жадность купюры" },
      { e: "😬", k: "неловкость стресс напряжение" },
      { e: "😇", k: "ангел святой доброта нимб" },
      { e: "🤭", k: "смущение секрет шёпот" },
      { e: "😆", k: "смех веселье хихиканье" },
    ],
  },
  {
    name: "Природа",
    icon: "🌿",
    emojis: [
      { e: "🐶", k: "собака пёс питомец животное" },
      { e: "🐱", k: "кот кошка питомец животное" },
      { e: "🐻", k: "медведь животное лес" },
      { e: "🦊", k: "лиса животное рыжий лес" },
      { e: "🐨", k: "коала животное австралия" },
      { e: "🐼", k: "панда животное чёрно-белый" },
      { e: "🦋", k: "бабочка насекомое цветок крылья" },
      { e: "🌸", k: "сакура цветок весна розовый" },
      { e: "🌺", k: "цветок гибискус тропик" },
      { e: "🌻", k: "подсолнух цветок жёлтый лето" },
      { e: "🌈", k: "радуга цвет дождь красота" },
      { e: "🌊", k: "волна море океан вода" },
      { e: "🌙", k: "луна ночь небо сон" },
      { e: "⭐", k: "звезда небо яркий" },
      { e: "☀️", k: "солнце день тепло лето" },
      { e: "🍀", k: "клевер удача зелёный растение" },
      { e: "🌲", k: "дерево лес природа ель" },
      { e: "🌿", k: "трава зелень природа листья" },
      { e: "🌹", k: "роза цветок любовь красный" },
      { e: "🦁", k: "лев животное король сила" },
    ],
  },
  {
    name: "Еда",
    icon: "🍕",
    emojis: [
      { e: "🍕", k: "пицца еда итальянский сыр" },
      { e: "🍔", k: "бургер гамбургер еда фастфуд" },
      { e: "🍣", k: "суши японский еда рыба" },
      { e: "🍜", k: "лапша рамен азиатский суп" },
      { e: "🎂", k: "торт день рождения праздник" },
      { e: "🍦", k: "мороженое десерт сладкое" },
      { e: "🍓", k: "клубника ягода красный сладкое" },
      { e: "🍇", k: "виноград ягода фиолетовый" },
      { e: "🌮", k: "тако мексиканский еда" },
      { e: "🍰", k: "торт пирог десерт сладкое" },
      { e: "☕", k: "кофе напиток утро тепло" },
      { e: "🍵", k: "чай напиток японский зелёный" },
      { e: "🥗", k: "салат зелёный здоровый еда" },
      { e: "🥑", k: "авокадо зелёный здоровый" },
      { e: "🍪", k: "печенье сладкое десерт" },
      { e: "🍩", k: "пончик сладкое десерт" },
      { e: "🍫", k: "шоколад сладкое коричневый" },
      { e: "🥐", k: "круассан хлеб завтрак французский" },
      { e: "🍎", k: "яблоко красный фрукт" },
      { e: "🍊", k: "апельсин оранжевый фрукт" },
    ],
  },
  {
    name: "Места",
    icon: "✈️",
    emojis: [
      { e: "✈️", k: "самолёт путешествие полёт небо" },
      { e: "🚗", k: "машина авто поездка" },
      { e: "🏠", k: "дом жилой квартира" },
      { e: "🏖️", k: "пляж море отдых лето" },
      { e: "🗺️", k: "карта путешествие маршрут" },
      { e: "🧭", k: "компас навигация направление" },
      { e: "🚀", k: "ракета космос запуск" },
      { e: "🏔️", k: "гора природа высота альпинизм" },
      { e: "🌍", k: "земля планета мир глобус" },
      { e: "🏙️", k: "город небоскрёбы мегаполис" },
      { e: "🚂", k: "поезд вагон железная дорога" },
      { e: "⛵", k: "лодка яхта море парус" },
      { e: "🏕️", k: "лагерь палатка кемпинг природа" },
      { e: "🗼", k: "эйфелева башня париж франция" },
      { e: "🗽", k: "статуя свободы нью-йорк сша" },
      { e: "🌃", k: "ночной город огни небо" },
      { e: "🏰", k: "замок средневековье крепость" },
      { e: "🎡", k: "колесо обозрения аттракцион парк" },
      { e: "🚁", k: "вертолёт полёт авиация" },
      { e: "🎢", k: "горки аттракцион парк развлечения" },
    ],
  },
  {
    name: "Объекты",
    icon: "💡",
    emojis: [
      { e: "📱", k: "телефон смартфон устройство" },
      { e: "💻", k: "ноутбук компьютер работа" },
      { e: "📷", k: "камера фото фотография" },
      { e: "🎵", k: "музыка нота звук мелодия" },
      { e: "🎮", k: "игра джойстик гейминг" },
      { e: "📚", k: "книги учёба библиотека знания" },
      { e: "🔑", k: "ключ замок открыть" },
      { e: "💡", k: "лампочка идея свет изобретение" },
      { e: "🔔", k: "колокол уведомление звонок" },
      { e: "✉️", k: "письмо почта сообщение конверт" },
      { e: "📌", k: "булавка закрепить пометить" },
      { e: "📎", k: "скрепка прикрепить файл" },
      { e: "🖊️", k: "ручка писать заметка" },
      { e: "📊", k: "график диаграмма аналитика статистика" },
      { e: "🔧", k: "гаечный ключ инструмент ремонт" },
      { e: "💰", k: "деньги мешок богатство финансы" },
      { e: "🎁", k: "подарок праздник сюрприз" },
      { e: "🏆", k: "трофей победа успех приз" },
      { e: "🔒", k: "замок безопасность закрыть" },
      { e: "📦", k: "коробка посылка упаковка" },
    ],
  },
  {
    name: "Символы",
    icon: "✨",
    emojis: [
      { e: "❤️", k: "сердце любовь красный" },
      { e: "⚡", k: "молния электричество энергия" },
      { e: "🔥", k: "огонь горячий тренд горит" },
      { e: "✨", k: "блеск искры волшебство" },
      { e: "💫", k: "звезда кружение мерцание" },
      { e: "🎉", k: "конфетти праздник ура вечеринка" },
      { e: "💯", k: "сто процентов отлично идеально" },
      { e: "✅", k: "галочка выполнено готово ок" },
      { e: "❌", k: "крест нет ошибка отмена" },
      { e: "⚠️", k: "предупреждение осторожно внимание" },
      { e: "💎", k: "алмаз бриллиант ценность редкость" },
      { e: "🌟", k: "звезда блеск особенный" },
      { e: "💥", k: "взрыв удар бах" },
      { e: "🎯", k: "цель мишень точность результат" },
      { e: "🔮", k: "шар магия предсказание кристалл" },
      { e: "🌀", k: "спираль циклон вихрь" },
      { e: "🏅", k: "медаль награда достижение" },
      { e: "🎭", k: "маски театр искусство" },
      { e: "🧩", k: "пазл кусочек головоломка" },
      { e: "🎲", k: "кубик игра случайность" },
    ],
  },
];

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
  hasEmoji: boolean;
  anchorEl: HTMLElement | null;
}

export function EmojiPicker({
  isOpen,
  onClose,
  onSelect,
  onRemove,
  hasEmoji,
  anchorEl,
}: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl) return;

    const PICKER_WIDTH = 288;
    const PICKER_HEIGHT = 380;
    const MARGIN = 8;

    const rect = anchorEl.getBoundingClientRect();
    let top = rect.bottom + MARGIN;
    let left = rect.left;

    // Flip up if near bottom edge
    if (top + PICKER_HEIGHT > window.innerHeight - 20) {
      top = rect.top - PICKER_HEIGHT - MARGIN;
    }

    // Align right edge to anchor if near right edge
    if (left + PICKER_WIDTH > window.innerWidth - 20) {
      left = rect.right - PICKER_WIDTH;
    }

    // Clamp to visible area
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    setPosition({ top, left });
  }, [isOpen, anchorEl]);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && pickerRef.current.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen, onClose, anchorEl]);

  if (!isOpen) return null;

  // Filtered emojis when searching
  const searchTrimmed = search.trim().toLowerCase();
  const filteredEmojis =
    searchTrimmed.length > 0
      ? EMOJI_CATEGORIES.flatMap((cat) =>
          cat.emojis.filter(
            (entry) =>
              entry.k.toLowerCase().includes(searchTrimmed) ||
              entry.e.includes(search)
          )
        )
      : null;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[9999] w-72 bg-[#161b22] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* Top actions */}
      <div className="p-2 border-b border-white/10">
        {hasEmoji && (
          <button
            onClick={onRemove}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors mb-2"
          >
            <X size={13} />
            <span>Убрать иконку</span>
          </button>
        )}
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск эмодзи..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none focus:border-indigo-500/50 transition-colors"            autoFocus
          />
        </div>
      </div>

      {/* Category tabs (only shown when not searching) */}
      {!filteredEmojis && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              title={cat.name}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
                activeCategory === idx
                  ? "bg-indigo-600/40 text-indigo-200"
                  : "hover:bg-white/10 text-gray-400"
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 overflow-y-auto max-h-[248px]">
        {filteredEmojis ? (
          <>
            {filteredEmojis.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                Ничего не найдено
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {filteredEmojis.map(({ e }) => (
                  <button
                    key={e}
                    onClick={() => onSelect(e)}
                    className="aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors leading-none"
                    title={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 px-1 pb-1.5 select-none">
              {EMOJI_CATEGORIES[activeCategory].name}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory].emojis.map(({ e }) => (
                <button
                  key={e}
                  onClick={() => onSelect(e)}
                  className="aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors leading-none"
                  title={e}
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
