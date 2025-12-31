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
import { webContents } from 'electron';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { WebviewProtocolProvider } from './webviewProtocolProvider.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
let WebviewMainService = class WebviewMainService extends Disposable {
    constructor(windowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
        this._onFoundInFrame = this._register(new Emitter());
        this.onFoundInFrame = this._onFoundInFrame.event;
        this._register(new WebviewProtocolProvider());
    }
    async setIgnoreMenuShortcuts(id, enabled) {
        let contents;
        if (typeof id.windowId === 'number') {
            const { windowId } = id;
            const window = this.windowsMainService.getWindowById(windowId);
            if (!window?.win) {
                throw new Error(`Invalid windowId: ${windowId}`);
            }
            contents = window.win.webContents;
        }
        else {
            const { webContentsId } = id;
            contents = webContents.fromId(webContentsId);
            if (!contents) {
                throw new Error(`Invalid webContentsId: ${webContentsId}`);
            }
        }
        if (!contents.isDestroyed()) {
            contents.setIgnoreMenuShortcuts(enabled);
        }
    }
    async findInFrame(windowId, frameName, text, options) {
        const initialFrame = this.getFrameByName(windowId, frameName);
        const frame = initialFrame;
        if (typeof frame.findInFrame === 'function') {
            frame.findInFrame(text, {
                findNext: options.findNext,
                forward: options.forward,
            });
            const foundInFrameHandler = (_, result) => {
                if (result.finalUpdate) {
                    this._onFoundInFrame.fire(result);
                    frame.removeListener('found-in-frame', foundInFrameHandler);
                }
            };
            frame.on('found-in-frame', foundInFrameHandler);
        }
    }
    async stopFindInFrame(windowId, frameName, options) {
        const initialFrame = this.getFrameByName(windowId, frameName);
        const frame = initialFrame;
        if (typeof frame.stopFindInFrame === 'function') {
            frame.stopFindInFrame(options.keepSelection ? 'keepSelection' : 'clearSelection');
        }
    }
    getFrameByName(windowId, frameName) {
        const window = this.windowsMainService.getWindowById(windowId.windowId);
        if (!window?.win) {
            throw new Error(`Invalid windowId: ${windowId}`);
        }
        const frame = window.win.webContents.mainFrame.framesInSubtree.find((frame) => {
            return frame.name === frameName;
        });
        if (!frame) {
            throw new Error(`Unknown frame: ${frameName}`);
        }
        return frame;
    }
};
WebviewMainService = __decorate([
    __param(0, IWindowsMainService)
], WebviewMainService);
export { WebviewMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2Vidmlldy9lbGVjdHJvbi1tYWluL3dlYnZpZXdNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWUsV0FBVyxFQUFnQixNQUFNLFVBQVUsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUTlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXJFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQU1qRCxZQUFpQyxrQkFBd0Q7UUFDeEYsS0FBSyxFQUFFLENBQUE7UUFEMEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUh4RSxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQTtRQUM3RSxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO1FBSWpELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVNLEtBQUssQ0FBQyxzQkFBc0IsQ0FDbEMsRUFBMEMsRUFDMUMsT0FBZ0I7UUFFaEIsSUFBSSxRQUFpQyxDQUFBO1FBRXJDLElBQUksT0FBUSxFQUFzQixDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBcUIsQ0FBQTtZQUMxQyxN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