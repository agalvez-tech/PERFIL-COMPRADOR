// Backend de perfil-comprador (Cloud Run). Sustituye el envío directo a
// Slack desde el navegador: gestiona botones Aceptado/Rechazado, contadores
// y el aviso a comprador+vendedor cuando se acepta.
//
// Ambas variables se configuran en Vercel (Project Settings → Environment
// Variables), NO en este archivo -- así no quedan expuestas en el
// historial de git al hacer push. Ver .env.example.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY;
