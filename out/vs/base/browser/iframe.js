/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const sameOriginWindowChainCache = new WeakMap();
function getParentWindowIfSameOrigin(w) {
    if (!w.parent || w.parent === w) {
        return null;
    }
    // Cannot really tell if we have access to the parent window unless we try to access something in it
    try {
        const location = w.location;
        const parentLocation = w.parent.location;
        if (location.origin !== 'null' &&
            parentLocation.origin !== 'null' &&
            location.origin !== parentLocation.origin) {
            return null;
        }
    }
    catch (e) {
        return null;
    }
    return w.parent;
}
export class IframeUtils {
    /**
     * Returns a chain of embedded windows with the same origin (which can be accessed programmatically).
     * Having a chain of length 1 might mean that the current execution environment is running outside of an iframe or inside an iframe embedded in a window with a different origin.
     */
    static getSameOriginWindowChain(targetWindow) {
        let windowChainCache = sameOriginWindowChainCache.get(targetWindow);
        if (!windowChainCache) {
            windowChainCache = [];
            sameOriginWindowChainCache.set(targetWindow, windowChainCache);
            let w = targetWindow;
            let parent;
            do {
                parent = getParentWindowIfSameOrigin(w);
                if (parent) {
                    windowChainCache.push({
                        window: new WeakRef(w),
                        iframeElement: w.frameElement || null,
                    });
                }
                else {
                    windowChainCache.push({
                        window: new WeakRef(w),
                        iframeElement: null,
                    });
                }
                w = parent;
            } while (w);
        }
        return windowChainCache.slice(0);
    }
    /**
     * Returns the position of `childWindow` relative to `ancestorWindow`
     */
    static getPositionOfChildWindowRelativeToAncestorWindow(childWindow, ancestorWindow) {
        if (!ancestorWindow || childWindow === ancestorWindow) {
            return {
                top: 0,
                left: 0,
            };
        }
        let top = 0, left = 0;
        const windowChain = this.getSameOriginWindowChain(childWindow);
        for (const windowChainEl of windowChain) {
            const windowInChain = windowChainEl.window.deref();
            top += windowInChain?.scrollY ?? 0;
            left += windowInChain?.scrollX ?? 0;
            if (windowInChain === ancestorWindow) {
                break;
            }
            if (!windowChainEl.iframeElement) {
                break;
            }
            const boundingRect = windowChainEl.iframeElement.getBoundingClientRect();
            top += boundingRect.top;
            left += boundingRect.left;
        }
        return {
            top: top,
            left: left,
        };
    }
}
/**
 * Returns a sha-256 composed of `parentOrigin` and `salt` converted to base 32
 */
export async function parentOriginHash(parentOrigin, salt) {
    // This same code is also inlined at `src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html`
    if (!crypto.subtle) {
        throw new Error(`'crypto.subtle' is not available so webviews will not work. This is likely because the editor is not running in a secure context (https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).`);
    }
    const strData = JSON.stringify({ parentOrigin, salt });
    const encoder = new TextEncoder();
    const arrData = encoder.encode(strData);
    const hash = await crypto.subtle.digest('sha-256', arrData);
    return sha256AsBase32(hash);
}
function sha256AsBase32(bytes) {
    const array = Array.from(new Uint8Array(bytes));
    const hexArray = array.map((b) => b.toString(16).padStart(2, '0')).join('');
    // sha256 has 256 bits, so we need at most ceil(lg(2^256-1)/lg(32)) = 52 chars to represent it in base 32
    return BigInt(`0x${hexArray}`).toString(32).padStart(52, '0');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWZyYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2lmcmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWdCaEcsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBd0MsQ0FBQTtBQUV0RixTQUFTLDJCQUEyQixDQUFDLENBQVM7SUFDN0MsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxvR0FBb0c7SUFDcEcsSUFBSSxDQUFDO1FBQ0osTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUMzQixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUN4QyxJQUNDLFFBQVEsQ0FBQyxNQUFNLEtBQUssTUFBTTtZQUMxQixjQUFjLENBQUMsTUFBTSxLQUFLLE1BQU07WUFDaEMsUUFBUSxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsTUFBTSxFQUN4QyxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFDaEIsQ0FBQztBQUVELE1BQU0sT0FBTyxXQUFXO0lBQ3ZCOzs7T0FHRztJQUNLLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxZQUFvQjtRQUMzRCxJQUFJLGdCQUFnQixHQUFHLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QixnQkFBZ0IsR0FBRyxFQUFF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QUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNELE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQzVCLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFrQjtJQUN6QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDL0MsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNFLHlHQUF5RztJQUN6RyxPQUFPLE1BQU0sQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDOUQsQ0FBQyJ9