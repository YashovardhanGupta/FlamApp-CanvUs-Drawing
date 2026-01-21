import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

// Initialize socket outside the hook to prevent multiple connections on re-renders
// In a real app, you might use a Context or Singleton pattern, but this works for simple cases.
const socket = io.connect("http://localhost:3001");

export const useSocket = (name, color) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // 1. Join variables
        socket.emit('join_room', { name, color });

        // 2. Listen for User Updates
        const handleUpdateUsers = (userList) => {
            setUsers(userList);
        };

        const handleUserJoined = (userName) => {
            toast(`${userName} joined the session`, {
                icon: '👋',
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
            });
        };

        socket.on('update_users', handleUpdateUsers);
        socket.on('user_joined', handleUserJoined);

        // Cleanup listeners
        return () => {
            socket.off('update_users', handleUpdateUsers);
            socket.off('user_joined', handleUserJoined);
        };
    }, [name, color]);

    return { socket, users };
};
