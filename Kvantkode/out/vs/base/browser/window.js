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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsWUFBb0IsRUFDcEIsZ0JBQXdCO0lBRXhCLE1BQU0sVUFBVSxHQUFHLFlBQW1DLENBQUE7SUFFdEQsSUFBSSxPQUFPLFVBQVUsQ0FBQyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbkQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLGdCQUFnQjtTQUMzQixDQUFDLENBQUE7SUFDSCxDQUFDO0FBQ0YsQ0FBQztBQUVELGlEQUFpRDtBQUNqRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsTUFBb0IsQ0FBQTtBQUU5QyxNQUFNLFVBQVUsaUJBQWlCLENBQUMsR0FBVztJQUM1QyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxHQUE2QixDQUFBO0lBRS9DLE9BQU8sT0FBTyxTQUFTLEVBQUUsY0FBYyxLQUFLLFFBQVEsQ0FBQTtBQUNyRCxDQUFDIn0=