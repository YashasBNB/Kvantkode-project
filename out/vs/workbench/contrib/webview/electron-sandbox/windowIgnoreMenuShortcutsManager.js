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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SWdub3JlTWVudVNob3J0Y3V0c01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2VsZWN0cm9uLXNhbmRib3gvd2luZG93SWdub3JlTWVudVNob3J0Y3V0c01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUt2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVoRixNQUFNLE9BQU8sZ0NBQWdDO0lBSzVDLFlBQ0Msb0JBQTJDLEVBQzNDLGtCQUF1QyxFQUN0QixrQkFBc0M7UUFBdEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUV2RCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV0RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FDaEQsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO0lBQ0YsQ0FBQztJQUVNLFFBQVE7UUFDZCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQVksb0NBQW9DO1FBQy9DLE9BQU8sV0FBVyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtJQUNuRCxDQUFDO0lBRVMsc0JBQXNCLENBQUMsS0FBYztRQUM5QyxJQUFJLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FDOUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUM5QyxLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==