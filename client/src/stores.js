import { writable } from 'svelte/store';

export const openModal = writable(false);
export const isMobile = writable(false);
export const playerData = writable(JSON.parse(localStorage.getItem('playerData')));
export const lastRoomJoined = writable(localStorage.getItem('lastRoomJoined'));