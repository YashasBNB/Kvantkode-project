/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from './process.js';
export function isHotReloadEnabled() {
    return env && !!env['VSCODE_DEV_DEBUG'];
}
export function registerHotReloadHandler(handler) {
    if (!isHotReloadEnabled()) {
        return { dispose() { } };
    }
    else {
        const handlers = registerGlobalHotReloadHandler();
        handlers.add(handler);
        return {
            dispose() {
                handlers.delete(handler);
            },
        };
    }
}
function registerGlobalHotReloadHandler() {
    if (!hotReloadHandlers) {
        hotReloadHandlers = new Set();
    }
    const g = globalThis;
    if (!g.$hotReload_applyNewExports) {
        g.$hotReload_applyNewExports = (args) => {
            const args2 = { config: { mode: undefined }, ...args };
            const results = [];
            for (const h of hotReloadHandlers) {
                const result = h(args2);
                if (result) {
                    results.push(result);
                }
            }
            if (results.length > 0) {
                return (newExports) => {
                    let result = false;
                    for (const r of results) {
                        if (r(newExports)) {
                            result = true;
                        }
                    }
                    return result;
                };
            }
            return undefined;
        };
    }
    return hotReloadHandlers;
}
let hotReloadHandlers = undefined;
if (isHotReloadEnabled()) {
    // This code does not run in production.
    registerHotReloadHandler(({ oldExports, newSrc, config }) => {
        if (config.mode !== 'patch-prototype') {
            return undefined;
        }
        return (newExports) => {
            for (const key in newExports) {
                const exportedItem = newExports[key];
                console.log(`[hot-reload] Patching prototype methods of '${key}'`, { exportedItem });
                if (typeof exportedItem === 'function' && exportedItem.prototype) {
                    const oldExportedItem = oldExports[key];
                    if (oldExportedItem) {
                        for (const prop of Object.getOwnPropertyNames(exportedItem.prototype)) {
                            const descriptor = Object.getOwnPropertyDescriptor(exportedItem.prototype, prop);
                            const oldDescriptor = Object.getOwnPropertyDescriptor(oldExportedItem.prototype, prop);
                            if (descriptor?.value?.toString() !== oldDescriptor?.value?.toString()) {
                                console.log(`[hot-reload] Patching prototype method '${key}.${prop}'`);
                            }
                            Object.defineProperty(oldExportedItem.prototype, prop, descriptor);
                        }
                        newExports[key] = oldExportedItem;
                    }
                }
            }
            return true;
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG90UmVsb2FkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vaG90UmVsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFbEMsTUFBTSxVQUFVLGtCQUFrQjtJQUNqQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDeEMsQ0FBQztBQUNELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUF5QjtJQUNqRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1FBQzNCLE9BQU8sRUFBRSxPQUFPLEtBQUksQ0FBQyxFQUFFLENBQUE7SUFDeEIsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLFFBQVEsR0FBRyw4QkFBOEIsRUFBRSxDQUFBO1FBQ2pELFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckIsT0FBTztZQUNOLE9BQU87Z0JBQ04sUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN6QixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDO0FBZ0JELFNBQVMsOEJBQThCO0lBQ3RDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3hCLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFHLFVBQTJDLENBQUE7SUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ25DLENBQUMsQ0FBQywwQkFBMEIsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMs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