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
import { getClientArea, getTopLeftOffset, isHTMLDivElement, isHTMLTextAreaElement, } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { language, locale } from '../../../../base/common/platform.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import localizedStrings from '../../../../platform/languagePacks/common/localizedStrings.js';
import { getLogs } from '../../../../platform/log/browser/log.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
let BrowserWindowDriver = class BrowserWindowDriver {
    constructor(fileService, environmentService, lifecycleService, logService) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
    }
    async getLogs() {
        return getLogs(this.fileService, this.environmentService);
    }
    async whenWorkbenchRestored() {
        this.logService.info('[driver] Waiting for restored lifecycle phase...');
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        this.logService.info('[driver] Restored lifecycle phase reached. Waiting for contributions...');
        await Registry.as(WorkbenchExtensions.Workbench).whenRestored;
        this.logService.info('[driver] Workbench contributions created.');
    }
    async setValue(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            return Promise.reject(new Error(`Element not found: ${selector}`));
        }
        const inputElement = element;
        inputElement.value = text;
        const event = new Event('input', { bubbles: true, cancelable: true });
        inputElement.dispatchEvent(event);
    }
    async isActiveElement(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (element !== mainWindow.document.activeElement) {
            const chain = [];
            let el = mainWindow.document.activeElement;
            while (el) {
                const tagName = el.tagName;
                const id = el.id ? `#${el.id}` : '';
                const classes = coalesce(el.className.split(/\s+/g).map((c) => c.trim()))
                    .map((c) => `.${c}`)
                    .join('');
                chain.unshift(`${tagName}${id}${classes}`);
                el = el.parentElement;
            }
            throw new Error(`Active element not found. Current active element is '${chain.join(' > ')}'. Looking for ${selector}`);
        }
        return true;
    }
    async getElements(selector, recursive) {
        const query = mainWindow.document.querySelectorAll(selector);
        const result = [];
        for (let i = 0; i < query.length; i++) {
            const element = query.item(i);
            result.push(this.serializeElement(element, recursive));
        }
        return result;
    }
    serializeElement(element, recursive) {
        const attributes = Object.create(null);
        for (let j = 0; j < element.attributes.length; j++) {
            const attr = element.attributes.item(j);
            if (attr) {
                attributes[attr.name] = attr.value;
            }
        }
        const children = [];
        if (recursive) {
            for (let i = 0; i < element.children.length; i++) {
                const child = element.children.item(i);
                if (child) {
                    children.push(this.serializeElement(child, true));
                }
            }
        }
        const { left, top } = getTopLeftOffset(element);
        return {
            tagName: element.tagName,
            className: element.className,
            textContent: element.textContent || '',
            attributes,
            children,
            left,
            top,
        };
    }
    async getElementXY(selector, xoffset, yoffset) {
        const offset = typeof xoffset === 'number' && typeof yoffset === 'number'
            ? { x: xoffset, y: yoffset }
            : undefined;
        return this._getElementXY(selector, offset);
    }
    async typeInEditor(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Editor not found: ${selector}`);
        }
        if (isHTMLDivElement(element)) {
            // Edit context is enabled
            const editContext = element.editContext;
            if (!editContext) {
                throw new Error(`Edit context not found: ${selector}`);
            }
            const selectionStart = editContext.selectionStart;
            const selectionEnd = editContext.selectionEnd;
            const event = new TextUpdateEvent('textupdate', {
                updateRangeStart: selectionStart,
                updateRangeEnd: selectionEnd,
                text,
                selectionStart: selectionStart + text.length,
                selectionEnd: selectionStart + text.length,
                compositionStart: 0,
                compositionEnd: 0,
            });
            editContext.dispatchEvent(event);
        }
        else if (isHTMLTextAreaElement(element)) {
            const start = element.selectionStart;
            const newStart = start + text.length;
            const value = element.value;
            const newValue = value.substr(0, start) + text + value.substr(start);
            element.value = newValue;
            element.setSelectionRange(newStart, newStart);
            const event = new Event('input', { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        }
    }
    async getEditorSelection(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Editor not found: ${selector}`);
        }
        if (isHTMLDivElement(element)) {
            const editContext = element.editContext;
            if (!editContext) {
                throw new Error(`Edit context not found: ${selector}`);
            }
            return { selectionStart: editContext.selectionStart, selectionEnd: editContext.selectionEnd };
        }
        else if (isHTMLTextAreaElement(element)) {
            return { selectionStart: element.selectionStart, selectionEnd: element.selectionEnd };
        }
        else {
            throw new Error(`Unknown type of element: ${selector}`);
        }
    }
    async getTerminalBuffer(selector) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Terminal not found: ${selector}`);
        }
        const xterm = element.xterm;
        if (!xterm) {
            throw new Error(`Xterm not found: ${selector}`);
        }
        const lines = [];
        for (let i = 0; i < xterm.buffer.active.length; i++) {
            lines.push(xterm.buffer.active.getLine(i).translateToString(true));
        }
        return lines;
    }
    async writeInTerminal(selector, text) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        const xterm = element.xterm;
        if (!xterm) {
            throw new Error(`Xterm not found: ${selector}`);
        }
        xterm.input(text);
    }
    getLocaleInfo() {
        return Promise.resolve({
            language: language,
            locale: locale,
        });
    }
    getLocalizedStrings() {
        return Promise.resolve({
            open: localizedStrings.open,
            close: localizedStrings.close,
            find: localizedStrings.find,
        });
    }
    async _getElementXY(selector, offset) {
        const element = mainWindow.document.querySelector(selector);
        if (!element) {
            return Promise.reject(new Error(`Element not found: ${selector}`));
        }
        const { left, top } = getTopLeftOffset(element);
        const { width, height } = getClientArea(element);
        let x, y;
        if (offset) {
            x = left + offset.x;
            y = top + offset.y;
        }
        else {
            x = left + width / 2;
            y = top + height / 2;
        }
        x = Math.round(x);
        y = Math.round(y);
        return { x, y };
    }
    async exitApplication() {
        // No-op in web
    }
};
BrowserWindowDriver = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILifecycleService),
    __param(3, ILogService)
], BrowserWindowDriver);
export { BrowserWindowDriver };
export function registerWindowDriver(instantiationService) {
    Object.assign(mainWindow, { driver: instantiationService.createInstance(BrowserWindowDriver) });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJpdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RyaXZlci9icm93c2VyL2RyaXZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sYUFBYSxFQUNiLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIscUJBQXFCLEdBQ3JCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV6RSxPQUFPLGdCQUFnQixNQUFNLCtEQUErRCxDQUFBO0FBQzVGLE9BQU8sRUFBWSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFBO0FBR2hGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBQy9CLFlBQ2dDLFdBQXlCLEVBQ2xCLGtCQUF1QyxFQUN6QyxnQkFBbUMsRUFDekMsVUFBdUI7UUFIdEIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDbEIs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