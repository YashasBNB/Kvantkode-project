/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { equals } from '../../../../base/common/arrays.js';
import { isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
/**
 * Set when the find widget in a webview in a webview is visible.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE = new RawContextKey('webviewFindWidgetVisible', false);
/**
 * Set when the find widget in a webview is focused.
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_FOCUSED = new RawContextKey('webviewFindWidgetFocused', false);
/**
 * Set when the find widget in a webview is enabled in a webview
 */
export const KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED = new RawContextKey('webviewFindWidgetEnabled', false);
export const IWebviewService = createDecorator('webviewService');
export var WebviewContentPurpose;
(function (WebviewContentPurpose) {
    WebviewContentPurpose["NotebookRenderer"] = "notebookRenderer";
    WebviewContentPurpose["CustomEditor"] = "customEditor";
    WebviewContentPurpose["WebviewView"] = "webviewView";
})(WebviewContentPurpose || (WebviewContentPurpose = {}));
/**
 * Check if two {@link WebviewContentOptions} are equal.
 */
export function areWebviewContentOptionsEqual(a, b) {
    return (a.allowMultipleAPIAcquire === b.allowMultipleAPIAcquire &&
        a.allowScripts === b.allowScripts &&
        a.allowForms === b.allowForms &&
        equals(a.localResourceRoots, b.localResourceRoots, isEqual) &&
        equals(a.portMapping, b.portMapping, (a, b) => a.extensionHostPort === b.extensionHostPort && a.webviewPort === b.webviewPort) &&
        areEnableCommandUrisEqual(a, b));
}
function areEnableCommandUrisEqual(a, b) {
    if (a.enableCommandUris === b.enableCommandUris) {
        return true;
    }
    if (Array.isArray(a.enableCommandUris) && Array.isArray(b.enableCommandUris)) {
        return equals(a.enableCommandUris, b.enableCommandUris);
    }
    return false;
}
/**
 * Stores the unique origins for a webview.
 *
 * These are randomly generated
 */
let WebviewOriginStore = class WebviewOriginStore {
    constructor(rootStorageKey, storageService) {
        this._memento = new Memento(rootStorageKey, storageService);
        this._state = this._memento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getOrigin(viewType, additionalKey) {
        const key = this._getKey(viewType, additionalKey);
        const existing = this._state[key];
        if (existing && typeof existing === 'string') {
            return existing;
        }
        const newOrigin = generateUuid();
        this._state[key] = newOrigin;
        this._memento.saveMemento();
        return newOrigin;
    }
    _getKey(viewType, additionalKey) {
        return JSON.stringify({ viewType, key: additionalKey });
    }
};
WebviewOriginStore = __decorate([
    __param(1, IStorageService)
], WebviewOriginStore);
export { WebviewOriginStore };
/**
 * Stores the unique origins for a webview.
 *
 * These are randomly generated, but keyed on extension and webview viewType.
 */
let ExtensionKeyedWebviewOriginStore = class ExtensionKeyedWebviewOriginStore {
    constructor(rootStorageKey, storageService) {
        this._store = new WebviewOriginStore(rootStorageKey, storageService);
    }
    getOrigin(viewType, extId) {
        return this._store.getOrigin(viewType, extId.value);
    }
};
ExtensionKeyedWebviewOriginStore = __decorate([
    __param(1, IStorageService)
], ExtensionKeyedWebviewOriginStore);
export { ExtensionKeyedWebviewOriginStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFFTixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sNEJBQTRCLENBQUE7QUFFbkU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxJQUFJLGFBQWEsQ0FDOUUsMEJBQTBCLEVBQzFCLEtBQUssQ0FDTCxDQUFBO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxJQUFJLGFBQWEsQ0FDOUUsMEJBQTBCLEVBQzFCLEtBQUssQ0FDTCxDQUFBO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxJQUFJLGFBQWEsQ0FDOUUsMEJBQTBCLEVBQzFCLEtBQUssQ0FDTCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQTtBQThDakYsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyw4REFBcUMsQ0FBQTtJQUNyQyxzREFBNkIsQ0FBQTtJQUM3QixvREFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBSmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJdEM7QUF3REQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsNkJBQTZCLENBQzVDLENBQXdCLEVBQ3hCLENBQXdCO0lBRXhCLE9BQU8sQ0FDTixDQUFDLENBQUMsdUJBQXVCLEtBQUssQ0FBQyxDQUFDLHVCQUF1QjtRQUN2RCxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxZQUFZO1FBQ2pDLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLFVBQVU7UUFDN0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDO1FBQzNELE1BQU0sQ0FDTCxDQUFDLENBQUMsV0FBVyxFQUNiLENBQUMsQ0FBQyxXQUFXLEVBQ2IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxDQUFDLGlCQUFpQixJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FDeEY7UUFDRCx5QkFBeUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQy9CLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxDQUF3QixFQUFFLENBQXdCO0lBQ3BGLElBQUksQ0FBQyxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7UUFDOUUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUE4S0Q7Ozs7R0FJRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBSTlCLFlBQVksY0FBc0IsRUFBbUIsY0FBK0I7UUFDbkYsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsa0VBQWlELENBQUE7SUFDeEYsQ0FBQztJQUVNLFNBQVMsQ0FBQyxRQUFnQixFQUFFLGFBQWlDO1FBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRWpELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakMsSUFBSSxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUMsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLFlBQVksRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFBO1FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDM0IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLE9BQU8sQ0FBQyxRQUFnQixFQUFFLGFBQWlDO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0NBQ0QsQ0FBQTtBQTFCWSxrQkFBa0I7SUFJTyxXQUFBLGVBQWUsQ0FBQTtHQUp4QyxrQkFBa0IsQ0EwQjlCOztBQUVEOzs7O0dBSUc7QUFDSSxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFnQztJQUc1QyxZQUFZLGNBQXNCLEVBQW1CLGNBQStCO1FBQ25GLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVNLFNBQVMsQ0FBQyxRQUFnQixFQUFFLEtBQTBCO1FBQzVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQTtBQVZZLGdDQUFnQztJQUdQLFdBQUEsZUFBZSxDQUFBO0dBSHhDLGdDQUFnQyxDQVU1QyJ9