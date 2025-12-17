// User Service API utility
// Adjust USER_SERVICE_URL as appropriate (localhost:3001 by default)
const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3001';

export type User = {
  userId: string;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  isOnline: boolean;
};

export async function login(username: string, password: string) {
  const res = await fetch(`${USER_SERVICE_URL}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data as { message: string; user: User; token: string };
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${USER_SERVICE_URL}/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data as { message: string; user: User; token: string };
}

export function logout() {
  // For a JWT system, logout is just removing token client-side
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
}

export async function getUserById(userId: string): Promise<User> {
  const res = await fetch(`${USER_SERVICE_URL}/users/${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get user');
  return data as User;
}

