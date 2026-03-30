import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

interface EmojiEntry {
  emoji: string;
  keywords: string;
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
      { emoji: "😀", keywords: "улыбка счастье радость смайл весёлый" },
      { emoji: "😊", keywords: "улыбка мягкий счастье смайл" },
      { emoji: "😂", keywords: "смех хохот слёзы юмор ржу" },
      { emoji: "🥰", keywords: "любовь сердца влюблённость нежность" },
      { emoji: "😎", keywords: "круто солнечные очки стиль" },
      { emoji: "🤔", keywords: "думать размышление вопрос идея" },
      { emoji: "😴", keywords: "сон усталость zzz отдых дрёма" },
      { emoji: "🤗", keywords: "обнимать радость тепло привет объятие" },
      { emoji: "😅", keywords: "пот нервный облегчение неловко" },
      { emoji: "🙃", keywords: "перевёрнутый ирония сарказм" },
      { emoji: "🤩", keywords: "восхищение звёзды wow восторг" },
      { emoji: "🥳", keywords: "праздник вечеринка день рождения" },
      { emoji: "😢", keywords: "плач грусть слёзы горе печаль" },
      { emoji: "😡", keywords: "злость гнев раздражение сердитый" },
      { emoji: "🤯", keywords: "взрыв мозга шок удивление" },
      { emoji: "🤑", keywords: "деньги богатство жадность купюры" },
      { emoji: "😬", keywords: "неловкость стресс напряжение" },
      { emoji: "😇", keywords: "ангел святой доброта нимб" },
      { emoji: "🤭", keywords: "смущение секрет шёпот" },
      { emoji: "😆", keywords: "смех веселье хихиканье" },
    ],
  },
  {
    name: "Природа",
    icon: "🌿",
    emojis: [
      { emoji: "🐶", keywords: "собака пёс питомец животное" },
      { emoji: "🐱", keywords: "кот кошка питомец животное" },
      { emoji: "🐻", keywords: "медведь животное лес" },
      { emoji: "🦊", keywords: "лиса животное рыжий лес" },
      { emoji: "🐨", keywords: "коала животное австралия" },
      { emoji: "🐼", keywords: "панда животное чёрно-белый" },
      { emoji: "🦋", keywords: "бабочка насекомое цветок крылья" },
      { emoji: "🌸", keywords: "сакура цветок весна розовый" },
      { emoji: "🌺", keywords: "цветок гибискус тропик" },
      { emoji: "🌻", keywords: "подсолнух цветок жёлтый лето" },
      { emoji: "🌈", keywords: "радуга цвет дождь красота" },
      { emoji: "🌊", keywords: "волна море океан вода" },
      { emoji: "🌙", keywords: "луна ночь небо сон" },
      { emoji: "⭐", keywords: "звезда небо яркий" },
      { emoji: "☀️", keywords: "солнце день тепло лето" },
      { emoji: "🍀", keywords: "клевер удача зелёный растение" },
      { emoji: "🌲", keywords: "дерево лес природа ель" },
      { emoji: "🌿", keywords: "трава зелень природа листья" },
      { emoji: "🌹", keywords: "роза цветок любовь красный" },
      { emoji: "🦁", keywords: "лев животное король сила" },
    ],
  },
  {
    name: "Еда",
    icon: "🍕",
    emojis: [
      { emoji: "🍕", keywords: "пицца еда итальянский сыр" },
      { emoji: "🍔", keywords: "бургер гамбургер еда фастфуд" },
      { emoji: "🍣", keywords: "суши японский еда рыба" },
      { emoji: "🍜", keywords: "лапша рамен азиатский суп" },
      { emoji: "🎂", keywords: "торт день рождения праздник" },
      { emoji: "🍦", keywords: "мороженое десерт сладкое" },
      { emoji: "🍓", keywords: "клубника ягода красный сладкое" },
      { emoji: "🍇", keywords: "виноград ягода фиолетовый" },
      { emoji: "🌮", keywords: "тако мексиканский еда" },
      { emoji: "🍰", keywords: "торт пирог десерт сладкое" },
      { emoji: "☕", keywords: "кофе напиток утро тепло" },
      { emoji: "🍵", keywords: "чай напиток японский зелёный" },
      { emoji: "🥗", keywords: "салат зелёный здоровый еда" },
      { emoji: "🥑", keywords: "авокадо зелёный здоровый" },
      { emoji: "🍪", keywords: "печенье сладкое десерт" },
      { emoji: "🍩", keywords: "пончик сладкое десерт" },
      { emoji: "🍫", keywords: "шоколад сладкое коричневый" },
      { emoji: "🥐", keywords: "круассан хлеб завтрак французский" },
      { emoji: "🍎", keywords: "яблоко красный фрукт" },
      { emoji: "🍊", keywords: "апельсин оранжевый фрукт" },
    ],
  },
  {
    name: "Места",
    icon: "✈️",
    emojis: [
      { emoji: "✈️", keywords: "самолёт путешествие полёт небо" },
      { emoji: "🚗", keywords: "машина авто поездка" },
      { emoji: "🏠", keywords: "дом жилой квартира" },
      { emoji: "🏖️", keywords: "пляж море отдых лето" },
      { emoji: "🗺️", keywords: "карта путешествие маршрут" },
      { emoji: "🧭", keywords: "компас навигация направление" },
      { emoji: "🚀", keywords: "ракета космос запуск" },
      { emoji: "🏔️", keywords: "гора природа высота альпинизм" },
      { emoji: "🌍", keywords: "земля планета мир глобус" },
      { emoji: "🏙️", keywords: "город небоскрёбы мегаполис" },
      { emoji: "🚂", keywords: "поезд вагон железная дорога" },
      { emoji: "⛵", keywords: "лодка яхта море парус" },
      { emoji: "🏕️", keywords: "лагерь палатка кемпинг природа" },
      { emoji: "🗼", keywords: "эйфелева башня париж франция" },
      { emoji: "🗽", keywords: "статуя свободы нью-йорк сша" },
      { emoji: "🌃", keywords: "ночной город огни небо" },
      { emoji: "🏰", keywords: "замок средневековье крепость" },
      { emoji: "🎡", keywords: "колесо обозрения аттракцион парк" },
      { emoji: "🚁", keywords: "вертолёт полёт авиация" },
      { emoji: "🎢", keywords: "горки аттракцион парк развлечения" },
    ],
  },
  {
    name: "Объекты",
    icon: "💡",
    emojis: [
      { emoji: "📱", keywords: "телефон смартфон устройство" },
      { emoji: "💻", keywords: "ноутбук компьютер работа" },
      { emoji: "📷", keywords: "камера фото фотография" },
      { emoji: "🎵", keywords: "музыка нота звук мелодия" },
      { emoji: "🎮", keywords: "игра джойстик гейминг" },
      { emoji: "📚", keywords: "книги учёба библиотека знания" },
      { emoji: "🔑", keywords: "ключ замок открыть" },
      { emoji: "💡", keywords: "лампочка идея свет изобретение" },
      { emoji: "🔔", keywords: "колокол уведомление звонок" },
      { emoji: "✉️", keywords: "письмо почта сообщение конверт" },
      { emoji: "📌", keywords: "булавка закрепить пометить" },
      { emoji: "📎", keywords: "скрепка прикрепить файл" },
      { emoji: "🖊️", keywords: "ручка писать заметка" },
      { emoji: "📊", keywords: "график диаграмма аналитика статистика" },
      { emoji: "🔧", keywords: "гаечный ключ инструмент ремонт" },
      { emoji: "💰", keywords: "деньги мешок богатство финансы" },
      { emoji: "🎁", keywords: "подарок праздник сюрприз" },
      { emoji: "🏆", keywords: "трофей победа успех приз" },
      { emoji: "🔒", keywords: "замок безопасность закрыть" },
      { emoji: "📦", keywords: "коробка посылка упаковка" },
    ],
  },
  {
    name: "Символы",
    icon: "✨",
    emojis: [
      { emoji: "❤️", keywords: "сердце любовь красный" },
      { emoji: "⚡", keywords: "молния электричество энергия" },
      { emoji: "🔥", keywords: "огонь горячий тренд горит" },
      { emoji: "✨", keywords: "блеск искры волшебство" },
      { emoji: "💫", keywords: "звезда кружение мерцание" },
      { emoji: "🎉", keywords: "конфетти праздник ура вечеринка" },
      { emoji: "💯", keywords: "сто процентов отлично идеально" },
      { emoji: "✅", keywords: "галочка выполнено готово ок" },
      { emoji: "❌", keywords: "крест нет ошибка отмена" },
      { emoji: "⚠️", keywords: "предупреждение осторожно внимание" },
      { emoji: "💎", keywords: "алмаз бриллиант ценность редкость" },
      { emoji: "🌟", keywords: "звезда блеск особенный" },
      { emoji: "💥", keywords: "взрыв удар бах" },
      { emoji: "🎯", keywords: "цель мишень точность результат" },
      { emoji: "🔮", keywords: "шар магия предсказание кристалл" },
      { emoji: "🌀", keywords: "спираль циклон вихрь" },
      { emoji: "🏅", keywords: "медаль награда достижение" },
      { emoji: "🎭", keywords: "маски театр искусство" },
      { emoji: "🧩", keywords: "пазл кусочек головоломка" },
      { emoji: "🎲", keywords: "кубик игра случайность" },
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

    if (top + PICKER_HEIGHT > window.innerHeight - 20) {
      top = rect.top - PICKER_HEIGHT - MARGIN;
    }

    if (left + PICKER_WIDTH > window.innerWidth - 20) {
      left = rect.right - PICKER_WIDTH;
    }

    if (left < 10) left = 10;
    if (top < 10) top = 10;

    setPosition({ top, left });
  }, [isOpen, anchorEl]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (pickerRef.current && pickerRef.current.contains(target)) return;
      if (anchorEl && anchorEl.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen, onClose, anchorEl]);

  if (!isOpen) return null;

  const searchTermLower = search.trim().toLowerCase();
  const filteredEmojis =
    searchTermLower.length > 0
      ? EMOJI_CATEGORIES.flatMap((category) =>
          category.emojis.filter(
            (emojiEntry) =>
              emojiEntry.keywords.toLowerCase().includes(searchTermLower) ||
              emojiEntry.emoji.includes(search)
          )
        )
      : null;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[9999] w-72 bg-[#161b22] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-white/10">
        {hasEmoji && (
          <button
            onClick={onRemove}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mb-2"
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
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50 transition-colors"
            autoFocus
          />
        </div>
      </div>

      {!filteredEmojis && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/10 overflow-x-auto">
          {EMOJI_CATEGORIES.map((category, categoryIndex) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(categoryIndex)}
              title={category.name}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
                activeCategory === categoryIndex
                  ? "bg-blue-600/40 text-blue-200"
                  : "hover:bg-white/10 text-gray-400"
              }`}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 overflow-y-auto max-h-[248px]">
        {filteredEmojis ? (
          <>
            {filteredEmojis.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                Ничего не найдено
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {filteredEmojis.map(({ emoji }) => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors leading-none"
                    title={emoji}
                  >
                    {emoji}
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
              {EMOJI_CATEGORIES[activeCategory].emojis.map(({ emoji }) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors leading-none"
                  title={emoji}
                >
                  {emoji}
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
