/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extname } from './path.js';
export const Mimes = Object.freeze({
    text: 'text/plain',
    binary: 'application/octet-stream',
    unknown: 'application/unknown',
    markdown: 'text/markdown',
    latex: 'text/latex',
    uriList: 'text/uri-list',
    html: 'text/html',
});
const mapExtToTextMimes = {
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ics': 'text/calendar',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.txt': 'text/plain',
    '.xml': 'text/xml',
};
// Known media mimes that we can handle
const mapExtToMediaMimes = {
    '.aac': 'audio/x-aac',
    '.avi': 'video/x-msvideo',
    '.bmp': 'image/bmp',
    '.flv': 'video/x-flv',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jpe': 'image/jpg',
    '.jpeg': 'image/jpg',
    '.jpg': 'image/jpg',
    '.m1v': 'video/mpeg',
    '.m2a': 'audio/mpeg',
    '.m2v': 'video/mpeg',
    '.m3a': 'audio/mpeg',
    '.mid': 'audio/midi',
    '.midi': 'audio/midi',
    '.mk3d': 'video/x-matroska',
    '.mks': 'video/x-matroska',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.movie': 'video/x-sgi-movie',
    '.mp2': 'audio/mpeg',
    '.mp2a': 'audio/mpeg',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mp4a': 'audio/mp4',
    '.mp4v': 'video/mp4',
    '.mpe': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mpg4': 'video/mp4',
    '.mpga': 'audio/mpeg',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.ogv': 'video/ogg',
    '.png': 'image/png',
    '.psd': 'image/vnd.adobe.photoshop',
    '.qt': 'video/quicktime',
    '.spx': 'audio/ogg',
    '.svg': 'image/svg+xml',
    '.tga': 'image/x-tga',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.wav': 'audio/x-wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.wma': 'audio/x-ms-wma',
    '.wmv': 'video/x-ms-wmv',
    '.woff': 'application/font-woff',
};
export function getMediaOrTextMime(path) {
    const ext = extname(path);
    const textMime = mapExtToTextMimes[ext.toLowerCase()];
    if (textMime !== undefined) {
        return textMime;
    }
    else {
        return getMediaMime(path);
    }
}
export function getMediaMime(path) {
    const ext = extname(path);
    return mapExtToMediaMimes[ext.toLowerCase()];
}
export function getExtensionForMimeType(mimeType) {
    for (const extension in mapExtToMediaMimes) {
        if (mapExtToMediaMimes[extension] === mimeType) {
            return extension;
        }
    }
    return undefined;
}
const _simplePattern = /^(.+)\/(.+?)(;.+)?$/;
export function normalizeMimeType(mimeType, strict) {
    const match = _simplePattern.exec(mimeType);
    if (!match) {
        return strict ? undefined : mimeType;
    }
    // https://datatracker.ietf.org/doc/html/rfc2045#section-5.1
    // media and subtype must ALWAYS be lowercase, parameter not
    return `${match[1].toLowerCase()}/${match[2].toLowerCase()}${match[3] ?? ''}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWltZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbWltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRW5DLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2xDLElBQUksRUFBRSxZQUFZO0lBQ2xCLE1BQU0sRUFBRSwwQkFBMEI7SUFDbEMsT0FBTyxFQUFFLHFCQUFxQjtJQUM5QixRQUFRLEVBQUUsZUFBZTtJQUN6QixLQUFLLEVBQUUsWUFBWTtJQUNuQixPQUFPLEVBQUUsZUFBZTtJQUN4QixJQUFJLEVBQUUsV0FBVztDQUNqQixDQUFDLENBQUE7QUFNRixNQUFNLGlCQUFpQixHQUF1QjtJQUM3QyxNQUFNLEVBQUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsV0FBVztJQUNuQixPQUFPLEVBQUUsV0FBVztJQUNwQixNQUFNLEVBQUUsZUFBZTtJQUN2QixLQUFLLEVBQUUsaUJBQWlCO0lBQ3hCLE1BQU0sRUFBRSxpQkFBaUI7SUFDekIsTUFBTSxFQUFFLFlBQVk7SUFDcEIsTUFBTSxFQUFFLFVBQVU7Q0FDbEIsQ0FBQTtBQUVELHVDQUF1QztBQUN2QyxNQUFNLGtCQUFrQixHQUF1QjtJQUM5QyxNQUFNLEVBQUUsYUFBYTtJQUNyQixNQUFNLEVBQUUsaUJBQWlCO0lBQ3pCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE1BQU0sRUFBRSxhQUFhO0lBQ3JCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE1BQU0sRUFBRSxjQUFjO0lBQ3RCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE9BQU8sRUFBRSxXQUFXO0lBQ3BCLE1BQU0sRUFBRSxXQUFX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