import { motion, AnimatePresence } from "framer-motion";
import { Plus, Bell, BellOff, Navigation, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkColor } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  onAddClick: () => void;
  onColorSelect: (color: MarkColor) => void;
  selectedColor: MarkColor;
  isAddingMode: boolean;
  onCancelAdd: () => void;
  onLocateMe: () => void;
  onToggleNotifications: () => void;
  notificationsEnabled: boolean;
  notificationsSupported: boolean;

  /** Короткий текст мітки */
  markNote: string;
  onMarkNoteChange: (value: string) => void;

  /** Оновити сторінку */
  onRefresh: () => void;
}

export function MapControls({
  onAddClick,
  onColorSelect,
  selectedColor,
  isAddingMode,
  onCancelAdd,
  onLocateMe,
  onToggleNotifications,
  notificationsEnabled,
  notificationsSupported,
  markNote,
  onMarkNoteChange,
  onRefresh,
}: MapControlsProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      {/* Верхній правий блок (з урахуванням notch / safe-area) */}
      <div
        className="absolute right-4 z-[1000] flex flex-col gap-3"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {notificationsSupported && (
          <Button
            variant="secondary"
            size="icon"
            onClick={onToggleNotifications}
            aria-label="Сповіщення"
            className={cn(
              "glass-panel rounded-full h-12 w-12 shadow-xl transition-all duration-300",
              notificationsEnabled
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            {notificationsEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </Button>
        )}

        <Button
          variant="secondary"
          size="icon"
          onClick={onLocateMe}
          aria-label="Моє місце"
          className="glass-panel rounded-full h-12 w-12 shadow-xl text-primary hover:scale-105 active:scale-95 transition-all"
        >
          <Navigation className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={onRefresh}
          aria-label="Оновити"
          className="glass-panel rounded-full h-12 w-12 shadow-xl text-primary hover:scale-105 active:scale-95 transition-all"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Нижній блок керування */}
      <div className="absolute bottom-8 left-0 right-0 z-[1000] flex flex-col items-center px-4 pointer-events-none">
        <AnimatePresence mode="wait">
          {!isAddingMode ? (
            <motion.div
              key="add-btn"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="pointer-events-auto"
            >
              <Button
                size="lg"
                onClick={onAddClick}
                className="h-16 px-8 rounded-full shadow-2xl bg-gradient-to-r from-primary to-blue-600 hover:to-blue-700 text-white font-display text-lg tracking-wide hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Plus className="mr-2 h-6 w-6" />
                Додати мітку
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="color-picker"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="glass-panel p-3 rounded-2xl shadow-2xl flex flex-col gap-3 pointer-events-auto mb-4 w-full max-w-md"
            >
              <div className="flex items-center gap-2 justify-center">
                <ColorOption
                  color="blue"
                  selected={selectedColor === "blue"}
                  onClick={() => onColorSelect("blue")}
                  label="Спокій"
                />
                <ColorOption
                  color="green"
                  selected={selectedColor === "green"}
                  onClick={() => onColorSelect("green")}
                  label="Актив"
                />
                <ColorOption
                  color="split"
                  selected={selectedColor === "split"}
                  onClick={() => onColorSelect("split")}
                  label="Подія"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={markNote}
                  onChange={(e) => onMarkNoteChange(e.target.value)}
                  maxLength={140}
                  placeholder="Короткий текст (до 140 символів)"
                  className="flex-1 h-10 px-3 rounded-xl bg-white/70 border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  variant="ghost"
                  onClick={onCancelAdd}
                  className="rounded-xl hover:bg-destructive/10 hover:text-destructive font-medium"
                >
                  Скасувати
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAddingMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium shadow-lg pointer-events-auto"
          >
            Торкніться будь-де на мапі, щоб поставити мітку
          </motion.div>
        )}
      </div>
    </>
  );
}

function ColorOption({
  color,
  selected,
  onClick,
  label,
}: {
  color: MarkColor;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-200",
        selected ? "bg-accent/10 scale-105 ring-2 ring-accent" : "hover:bg-muted"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full shadow-sm mb-1",
          color === "blue" && "bg-blue-500",
          color === "green" && "bg-green-500",
          color === "split" && "bg-gradient-to-r from-blue-500 to-green-500"
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </button>
  );
}
