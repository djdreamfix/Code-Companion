import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Mark } from "@shared/schema";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Підключення до поточного домену
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket підключено");
    });

    socket.on("mark.created", (newMark: Mark) => {
      // Оптимістично оновлюємо список міток
      queryClient.setQueryData([api.marks.list.path], (oldData: Mark[] | undefined) => {
        if (!oldData) return [newMark];

        // Перевірка на дублікати
        if (oldData.find((m) => m.id === newMark.id)) return oldData;

        return [...oldData, newMark];
      });

      const colorUa =
        newMark.color === "blue"
          ? "синя"
          : newMark.color === "green"
          ? "зелена"
          : "змішана";

      toast({
        title: "Нова мітка!",
        description: `Поруч з'явилась нова ${colorUa} мітка.`,
        duration: 3000,
      });
    });

    socket.on("mark.expired", ({ id }: { id: string }) => {
      queryClient.setQueryData([api.marks.list.path], (oldData: Mark[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((m) => m.id !== id);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, toast]);

  return socketRef.current;
}