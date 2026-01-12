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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWZyYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvaWZyYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBZ0JoRyxNQUFNLDBCQUEwQixHQUFHLElBQUksT0FBTyxFQUF3QyxDQUFBO0FBRXRGLFNBQVMsMkJBQTJCLENBQUMsQ0FBUztJQUM3QyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELG9HQUFvRztJQUNwRyxJQUFJLENBQUM7UUFDSixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQzNCLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO1FBQ3hDLElBQ0MsUUFBUSxDQUFDLE1BQU0sS0FBSyxNQUFNO1lBQzFCLGNBQWMsQ0FBQyxNQUFNLEtBQUssTUFBTTtZQUNoQyxRQUFRLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxNQUFNLEVBQ3hDLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtBQUNoQixDQUFDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkI7OztPQUdHO0lBQ0ssTUFBTSxDQUFDLHdCQUF3QixDQUFDLFlBQW9CO1FBQzNELElBQUksZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLGdCQUFnQixHQUFH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