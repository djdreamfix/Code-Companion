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
      if (!res.ok) throw new Error("Failed to fetch marks");
      return api.marks.list.responses[200].parse(await res.json());
    },
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
        const error = await res.json();
        throw new Error(error.message || "Failed to create mark");
      }
      
      return api.marks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.marks.list.path] });
    },
  });
}
