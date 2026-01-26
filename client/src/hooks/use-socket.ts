import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/routes';
import { useToast } from '@/hooks/use-toast';
import { Mark } from '@shared/schema';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Connect to the same origin
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('mark.created', (newMark: Mark) => {
      // Optimistically update the list
      queryClient.setQueryData([api.marks.list.path], (oldData: Mark[] | undefined) => {
        if (!oldData) return [newMark];
        // Check for duplicates just in case
        if (oldData.find(m => m.id === newMark.id)) return oldData;
        return [...oldData, newMark];
      });

      toast({
        title: "New Mark!",
        description: `A new ${newMark.color} mark appeared nearby.`,
        duration: 3000,
      });
    });

    socket.on('mark.expired', ({ id }: { id: string }) => {
      queryClient.setQueryData([api.marks.list.path], (oldData: Mark[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(m => m.id !== id);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, toast]);

  return socketRef.current;
}
