import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { createMarkSchema } from "@shared/schema";
import { z } from "zod";

type CreateMarkInput = z.infer<typeof createMarkSchema>;

export function useMarks() {
  return useQuery({
    queryKey: [api.marks.list.path],
    queryFn: async () => {
      const res = await fetch(api.marks.list.path);
      if (!res.ok) throw new Error("Не вдалося отримати мітки");
      return api.marks.list.responses[200].parse(await res.json());
    },

    /**
     * ВАЖЛИВО для iPhone/Android:
     * Коли PWA/вкладка не активна — таймери та сокети можуть “заснути”.
     * Тому при поверненні в додаток ми примусово оновлюємо список.
     */
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    /**
     * Підтягувати мітки періодично (під твій cleanup на сервері кожні 10с).
     * У фоні браузер може приглушити інтервал — це нормально, але при поверненні
     * refetchOnWindowFocus все одно оновить.
     */
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,

    // Щоб при фокусі завжди робився запит, а не “вважалося свіжим”
    staleTime: 0,
  });
}

export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMarkInput) => {
      const res = await fetch(api.marks.create.path, {
        method: api.marks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        // сервер може повертати { error: "..."} або { message: "..." }
        let errorText = "Не вдалося створити мітку";
        try {
          const err = await res.json();
          errorText = err?.message || err?.error || errorText;
        } catch {
          // ignore
        }
        throw new Error(errorText);
      }

      return api.marks.create.responses[201].parse(await res.json());
    },

    onSuccess: () => {
      // Одразу підтягуємо актуальний список
      queryClient.invalidateQueries({ queryKey: [api.marks.list.path] });
    },
  });
}