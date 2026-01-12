/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../../base/common/platform.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { hasNativeTitlebar } from '../../../../platform/window/common/window.js';
export class WindowIgnoreMenuShortcutsManager {
    constructor(configurationService, mainProcessService, _nativeHostService) {
        this._nativeHostService = _nativeHostService;
        this._isUsingNativeTitleBars = hasNativeTitlebar(configurationService);
        this._webviewMainService = ProxyChannel.toService(mainProcessService.getChannel('webview'));
    }
    didFocus() {
        this.setIgnoreMenuShortcuts(true);
    }
    didBlur() {
        this.setIgnoreMenuShortcuts(false);
    }
    get _shouldToggleMenuShortcutsEnablement() {
        return isMacintosh || this._isUsingNativeTitleBars;
    }
    setIgnoreMenuShortcuts(value) {
        if (this._shouldToggleMenuShortcutsEnablement) {
            this._webviewMainService.setIgnoreMenuShortcuts({ windowId: this._nativeHostService.windowId }, value);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SWdub3JlTWVudVNob3J0Y3V0c01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvZWxlY3Ryb24tc2FuZGJveC93aW5kb3dJZ25vcmVNZW51U2hvcnRjdXRzTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBS3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWhGLE1BQU0sT0FBTyxnQ0FBZ0M7SUFLNUMsWUFDQyxvQkFBMkMsRUFDM0Msa0JBQXVDLEVBQ3RCLGtCQUFzQztRQUF0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBRXZELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRXRFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUNoRCxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQ3hDLENBQUE7SUFDRixDQUFDO0lBRU0sUUFBUTtRQUNkLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsSUFBWSxvQ0FBb0M7UUFDL0MsT0FBTyxXQUFXLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFBO0lBQ25ELENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxLQUFjO1FBQzlDLElBQUksSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixDQUM5QyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEVBQzlDLEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9