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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJpdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZHJpdmVyL2Jyb3dzZXIvZHJpdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixxQkFBcUIsR0FDckIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpFLE9BQU8sZ0JBQWdCLE1BQU0sK0RBQStELENBQUE7QUFDNUYsT0FBTyxFQUFZLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFHaEYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFDL0IsWUFDZ0MsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQ3pDLGdCQUFtQyxFQUN6QyxVQUF1QjtRQUh0QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztR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