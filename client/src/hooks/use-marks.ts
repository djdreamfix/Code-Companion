import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { createMarkSchema } from "@shared/schema";
import { z } from "zod";

type CreateMarkInput = z.infer<typeof createMarkSchema>;

function normalizeCreateMarkInput(data: CreateMarkInput): CreateMarkInput {
  // Перетворюємо "   " -> undefined, щоб не відправляти порожній note
  const note = data.note?.trim();
  const street = (data as any).street?.trim?.(); // якщо ти додаси street у schema

  return {
    ...data,
    ...(note ? { note } : { note: undefined }),
    ...(street ? { street } : {}),
  } as CreateMarkInput;
}

export function useMarks() {
  return useQuery({
    queryKey: [api.marks.list.path],
    queryFn: async () => {
      const res = await fetch(api.marks.list.path, { cache: "no-store" });
      if (!res.ok) throw new Error("Не вдалося отримати мітки");
      return api.marks.list.responses[200].parse(await res.json());
    },

    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (raw: CreateMarkInput) => {
      const data = normalizeCreateMarkInput(raw);

      // Діагностика: один раз глянеш у console і буде ясно чи note взагалі є.
      // Можеш потім прибрати.
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.log("POST /api/marks payload:", data);
      }

      const res = await fetch(api.marks.create.path, {
        method: api.marks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
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
      queryClient.invalidateQueries({ queryKey: [api.marks.list.path] });
    },
  });
}