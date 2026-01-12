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
import { localize } from '../../../../nls.js';
import { fromNow } from '../../../../base/common/date.js';
import { isLinuxSnap } from '../../../../base/common/platform.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { AbstractDialogHandler, } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let NativeDialogHandler = class NativeDialogHandler extends AbstractDialogHandler {
    constructor(logService, nativeHostService, productService, clipboardService) {
        super();
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.productService = productService;
        this.clipboardService = clipboardService;
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(prompt.type),
            title: prompt.title,
            message: prompt.message,
            detail: prompt.detail,
            buttons,
            cancelId: prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */,
            checkboxLabel: prompt.checkbox?.label,
            checkboxChecked: prompt.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        return this.getPromptResult(prompt, response, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(confirmation.type) ?? 'question',
            title: confirmation.title,
            message: confirmation.message,
            detail: confirmation.detail,
            buttons,
            cancelId: buttons.length - 1,
            checkboxLabel: confirmation.checkbox?.label,
            checkboxChecked: confirmation.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        return { confirmed: response === 0, checkboxChecked };
    }
    input() {
        throw new Error('Unsupported'); // we have no native API for password dialogs in Electron
    }
    async about() {
        let version = this.productService.version;
        if (this.productService.target) {
            version = `${version} (${this.productService.target} setup)`;
        }
        else if (this.productService.darwinUniversalAssetId) {
            version = `${version} (Universal)`;
        }
        const osProps = await this.nativeHostService.getOSProperties();
        const detailString = (useAgo) => {
            return localize({
                key: 'aboutDetail',
                comment: [
                    'Electron, Chromium, Node.js and V8 are product names that need no translation',
                ],
            }, 'VSCode Version: {0}\nVoid Version: {1}\nCommit: {2}\nDate: {3}\nElectron: {4}\nElectronBuildId: {5}\nChromium: {6}\nNode.js: {7}\nV8: {8}\nOS: {9}', version, this.productService.voidVersion || 'Unknown', // Void added this
            this.productService.commit || 'Unknown', this.productService.date
                ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}`
                : 'Unknown', process.versions['electron'], process.versions['microsoft-build'], process.versions['chrome'], process.versions['node'], process.versions['v8'], `${osProps.type} ${osProps.arch} ${osProps.release}${isLinuxSnap ? ' snap' : ''}`);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { response } = await this.nativeHostService.showMessageBox({
            type: 'info',
            message: this.productService.nameLong,
            detail: `\n${detail}`,
            buttons: [
                localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
                localize('okButton', 'OK'),
            ],
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        if (response === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
};
NativeDialogHandler = __decorate([
    __param(0, ILogService),
    __param(1, INativeHostService),
    __param(2, IProductService),
    __param(3, IClipboardService)
], NativeDialogHandler);
export { NativeDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvcGFydHMvZGlhbG9ncy9kaWFsb2dIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsR0FLckIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxxQkFBcUI7SUFDN0QsWUFDK0IsVUFBdUIsRUFDaEIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzdCLGdCQUFtQztRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUx1QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2hCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDeEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7SUFHeEUsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUksTUFBa0I7UUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRTdELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU3QyxNQUFNLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztZQUNqRixJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3JDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztZQUNuQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1lBQ3JCLE9BQU87WUFDUCxRQUFRLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWM7WUFDdEUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSztZQUNyQyxlQUFlLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPO1lBQ3pDLGNBQWMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxjQUFjO1NBQ2hELENBQUMsQ0FBQTtRQUVGLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQTJCO1FBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFekQsTUFBTSxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUM7WUFDakYsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVU7WUFDekQsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO1lBQ3pCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztZQUM3QixNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDM0IsT0FBTztZQUNQLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDNUIsYUFBYSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSztZQUMzQyxlQUFlLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPO1lBQy9DLGNBQWMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxjQUFjO1NBQ2hELENBQUMsQ0FBQTtRQUVGLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxLQUFLLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsS0FBSztRQUNKLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUEsQ0FBQyx5REFBeUQ7SUFDekYsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1YsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUE7UUFDekMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRyxHQUFHLE9BQU8sS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sU0FBUyxDQUFBO1FBQzdELENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEdBQUcsR0FBRyxPQUFPLGNBQWMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFOUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFlLEVBQVUsRUFBRTtZQUNoRCxPQUFPLFFBQVEsQ0FDZDtnQkFDQyxHQUFHLEVBQUUsYUFBYTtnQkFDbEIsT0FBTyxFQUFFO29CQUNSLCtFQUErRTtpQkFDL0U7YUFDRCxFQUNELG9KQUFvSixFQUNwSixPQUFPLEVBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLElBQUksU0FBUyxFQUFFLGtCQUFrQjtZQUNoRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSTtnQkFDdkIsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzlHLENBQUMsQ0FBQyxTQUFTLEVBQ1osT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFDNUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUNuQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUMxQixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUN4QixPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUN0QixHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDakYsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFeEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztZQUNoRSxJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVE7WUFDckMsTUFBTSxFQUFFLEtBQUssTUFBTSxFQUFFO1lBQ3JCLE9BQU8sRUFBRTtnQkFDUixRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUM7Z0JBQ3ZFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDO2FBQzFCO1lBQ0QsY0FBYyxFQUFFLGVBQWUsRUFBRSxDQUFDLGNBQWM7U0FDaEQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExR1ksbUJBQW1CO0lBRTdCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7R0FMUCxtQkFBbUIsQ0EwRy9CIn0=