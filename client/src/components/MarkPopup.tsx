import { Mark } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Clock } from "lucide-react";

interface MarkPopupProps {
  mark: Mark;
}

export function MarkPopup({ mark }: MarkPopupProps) {
  const timeLeft = formatDistanceToNow(new Date(mark.expiresAt), { addSuffix: true });
  const createdTime = formatDistanceToNow(new Date(mark.createdAt), { addSuffix: true });

  const colorLabel =
    mark.color === "blue"
      ? "Синя"
      : mark.color === "green"
      ? "Зелена"
      : "Змішана";

  const colorClass =
    mark.color === "blue"
      ? "text-blue-600 bg-blue-50"
      : mark.color === "green"
      ? "text-green-600 bg-green-50"
      : "text-purple-600 bg-purple-50";

  return (
    <div className="w-64 p-4 font-sans">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${colorClass}`}
        >
          {colorLabel}
        </span>
      </div>

      <div className="flex items-start gap-2 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm font-medium text-foreground leading-tight">
          {mark.street || "Невідоме місце"}
        </p>
      </div>

      {mark.note && mark.note.trim().length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Текст мітки</p>
          <p className="text-sm text-foreground leading-snug break-words">{mark.note}</p>
        </div>
      )}

      <div className="space-y-1.5 pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Зникне {timeLeft}</span>
        </div>

        <div className="text-[10px] text-muted-foreground/60 pl-5.5">
          Додано {createdTime}
        </div>
      </div>
    </div>
  );
}