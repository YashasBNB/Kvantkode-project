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
var NativeClipboardService_1;
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { URI } from '../../../../base/common/uri.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
let NativeClipboardService = class NativeClipboardService {
    static { NativeClipboardService_1 = this; }
    static { this.FILE_FORMAT = 'code/file-list'; } // Clipboard format for files
    constructor(nativeHostService) {
        this.nativeHostService = nativeHostService;
    }
    async readImage() {
        return this.nativeHostService.readImage();
    }
    async writeText(text, type) {
        return this.nativeHostService.writeClipboardText(text, type);
    }
    async readText(type) {
        return this.nativeHostService.readClipboardText(type);
    }
    async readFindText() {
        if (isMacintosh) {
            return this.nativeHostService.readClipboardFindText();
        }
        return '';
    }
    async writeFindText(text) {
        if (isMacintosh) {
            return this.nativeHostService.writeClipboardFindText(text);
        }
    }
    async writeResources(resources) {
        if (resources.length) {
            return this.nativeHostService.writeClipboardBuffer(NativeClipboardService_1.FILE_FORMAT, this.resourcesToBuffer(resources));
        }
    }
    async readResources() {
        return this.bufferToResources(await this.nativeHostService.readClipboardBuffer(NativeClipboardService_1.FILE_FORMAT));
    }
    async hasResources() {
        return this.nativeHostService.hasClipboard(NativeClipboardService_1.FILE_FORMAT);
    }
    resourcesToBuffer(resources) {
        return VSBuffer.fromString(resources.map((r) => r.toString()).join('\n'));
    }
    bufferToResources(buffer) {
        if (!buffer) {
            return [];
        }
        const bufferValue = buffer.toString();
        if (!bufferValue) {
            return [];
        }
        try {
            return bufferValue.split('\n').map((f) => URI.parse(f));
        }
        catch (error) {
            return []; // do not trust clipboard data
        }
    }
};
NativeClipboardService = NativeClipboardService_1 = __decorate([
    __param(0, INativeHostService)
], NativeClipboardService);
export { NativeClipboardService };
registerSingleton(IClipboardService, NativeClipboardService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jbGlwYm9hcmQvZWxlY3Ryb24tc2FuZGJveC9jbGlwYm9hcmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7O2FBQ1YsZ0JBQVcsR0FBRyxnQkFBZ0IsQUFBbkIsQ0FBbUIsR0FBQyw2QkFBNkI7SUFJcEYsWUFBaUQsaUJBQXFDO1FBQXJDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFBRyxDQUFDO0lBRTFGLEtBQUssQ0FBQyxTQUFTO1FBQ2QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQWdDO1FBQzdELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFnQztRQUM5QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBQ3RELENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVk7UUFDL0IsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzRCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBZ0I7UUFDcEMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQ2pELHdCQUFzQixDQUFDLFdBQVcsRUFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUNqQyxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYTtRQUNsQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FDNUIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsd0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQ3BGLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLHdCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxTQUFnQjtRQUN6QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDMUUsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQWdCO1FBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxDQUFBLENBQUMsOEJBQThCO1FBQ3pDLENBQUM7SUFDRixDQUFDOztBQXZFVyxzQkFBc0I7SUFLckIsV0FBQSxrQkFBa0IsQ0FBQTtHQUxuQixzQkFBc0IsQ0F3RWxDOztBQUVELGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixvQ0FBNEIsQ0FBQSJ9