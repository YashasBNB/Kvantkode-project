/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function ensureCodeWindow(targetWindow, fallbackWindowId) {
    const codeWindow = targetWindow;
    if (typeof codeWindow.vscodeWindowId !== 'number') {
        Object.defineProperty(codeWindow, 'vscodeWindowId', {
            get: () => fallbackWindowId,
        });
    }
}
// eslint-disable-next-line no-restricted-globals
export const mainWindow = window;
export function isAuxiliaryWindow(obj) {
    if (obj === mainWindow) {
        return false;
    }
    const candidate = obj;
    return typeof candidate?.vscodeWindowId === 'number';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLFlBQW9CLEVBQ3BCLGdCQUF3QjtJQUV4QixNQUFNLFVBQVUsR0FBRyxZQUFtQyxDQUFBO0lBRXRELElBQUksT0FBTyxVQUFVLENBQUMsY0FBYyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFO1lBQ25ELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0I7U0FDM0IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztBQUNGLENBQUM7QUFFRCxpREFBaUQ7QUFDakQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLE1BQW9CLENBQUE7QUFFOUMsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEdBQVc7SUFDNUMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDeEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsR0FBNkIsQ0FBQTtJQUUvQyxPQUFPLE9BQU8sU0FBUyxFQUFFLGNBQWMsS0FBSyxRQUFRLENBQUE7QUFDckQsQ0FBQyJ9