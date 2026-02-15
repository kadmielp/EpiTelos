/**
 * Platform detection service for EpiTelos.
 * Centralizes desktop (Tauri) vs web logic.
 */

// @ts-ignore
export const isDesktop = !!(window && window.__TAURI__);

export const getFileService = async () => {
    if (isDesktop) {
        const desktop = await import('./desktopFileService');
        return desktop;
    } else {
        const web = await import('./fileService');
        return web;
    }
};
