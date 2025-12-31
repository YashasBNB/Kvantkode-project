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
import { URI } from '../../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IWebviewWorkbenchService } from './webviewWorkbenchService.js';
let WebviewEditorInputSerializer = class WebviewEditorInputSerializer {
    static { this.ID = WebviewInput.typeId; }
    constructor(_webviewWorkbenchService) {
        this._webviewWorkbenchService = _webviewWorkbenchService;
    }
    canSerialize(input) {
        return this._webviewWorkbenchService.shouldPersist(input);
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const data = this.toJson(input);
        try {
            return JSON.stringify(data);
        }
        catch {
            return undefined;
        }
    }
    deserialize(_instantiationService, serializedEditorInput) {
        const data = this.fromJson(JSON.parse(serializedEditorInput));
        return this._webviewWorkbenchService.openRevivedWebview({
            webviewInitInfo: {
                providedViewType: data.providedId,
                origin: data.origin,
                title: data.title,
                options: data.webviewOptions,
                contentOptions: data.contentOptions,
                extension: data.extension,
            },
            viewType: data.viewType,
            title: data.title,
            iconPath: data.iconPath,
            state: data.state,
            group: data.group,
        });
    }
    fromJson(data) {
        return {
            ...data,
            extension: reviveWebviewExtensionDescription(data.extensionId, data.extensionLocation),
            iconPath: reviveIconPath(data.iconPath),
            state: reviveState(data.state),
            webviewOptions: restoreWebviewOptions(data.options),
            contentOptions: restoreWebviewContentOptions(data.options),
        };
    }
    toJson(input) {
        return {
            origin: input.webview.origin,
            viewType: input.viewType,
            providedId: input.providedId,
            title: input.getName(),
            options: { ...input.webview.options, ...input.webview.contentOptions },
            extensionLocation: input.extension?.location,
            extensionId: input.extension?.id.value,
            state: input.webview.state,
            iconPath: input.iconPath
                ? { light: input.iconPath.light, dark: input.iconPath.dark }
                : undefined,
            group: input.group,
        };
    }
};
WebviewEditorInputSerializer = __decorate([
    __param(0, IWebviewWorkbenchService)
], WebviewEditorInputSerializer);
export { WebviewEditorInputSerializer };
export function reviveWebviewExtensionDescription(extensionId, extensionLocation) {
    if (!extensionId) {
        return undefined;
    }
    const location = reviveUri(extensionLocation);
    if (!location) {
        return undefined;
    }
    return {
        id: new ExtensionIdentifier(extensionId),
        location,
    };
}
function reviveIconPath(data) {
    if (!data) {
        return undefined;
    }
    const light = reviveUri(data.light);
    const dark = reviveUri(data.dark);
    return light && dark ? { light, dark } : undefined;
}
function reviveUri(data) {
    if (!data) {
        return undefined;
    }
    try {
        if (typeof data === 'string') {
            return URI.parse(data);
        }
        return URI.from(data);
    }
    catch {
        return undefined;
    }
}
function reviveState(state) {
    return typeof state === 'string' ? state : undefined;
}
export function restoreWebviewOptions(options) {
    return options;
}
export function restoreWebviewContentOptions(options) {
    return {
        ...options,
        localResourceRoots: options.localResourceRoots?.map((uri) => reviveUri(uri)),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0U2VyaWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdFZGl0b3JJbnB1dFNlcmlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQVMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFtQ2hFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTRCO2FBQ2pCLE9BQUUsR0FBRyxZQUFZLENBQUMsTUFBTSxBQUF0QixDQUFzQjtJQUUvQyxZQUM0Qyx3QkFBa0Q7UUFBbEQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtJQUMzRixDQUFDO0lBRUcsWUFBWSxDQUFDLEtBQW1CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRU0sU0FBUyxDQUFDLEtBQW1CO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDO1lBQ0osT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFBQyxN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