import { writable } from 'svelte/store';

export const openModal = writable(false);
export const isMobile = writable(false)