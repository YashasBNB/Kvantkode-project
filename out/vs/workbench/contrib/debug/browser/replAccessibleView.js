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
import { IAccessibleViewService, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { getReplView } from './repl.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../../editor/common/core/position.js';
export class ReplAccessibleView {
    constructor() {
        this.priority = 70;
        this.name = 'debugConsole';
        this.when = ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view');
        this.type = "view" /* AccessibleViewType.View */;
    }
    getProvider(accessor) {
        const viewsService = accessor.get(IViewsService);
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const replView = getReplView(viewsService);
        if (!replView) {
            return undefined;
        }
        const focusedElement = replView.getFocusedElement();
        return new ReplOutputAccessibleViewProvider(replView, focusedElement, accessibleViewService);
    }
}
let ReplOutputAccessibleViewProvider = class ReplOutputAccessibleViewProvider extends Disposable {
    constructor(_replView, _focusedElement, _accessibleViewService) {
        super();
        this._replView = _replView;
        this._focusedElement = _focusedElement;
        this._accessibleViewService = _accessibleViewService;
        this.id = "repl" /* AccessibleViewProviderId.Repl */;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidResolveChildren = this._register(new Emitter());
        this.onDidResolveChildren = this._onDidResolveChildren.event;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = {
            type: "view" /* AccessibleViewType.View */,
        };
        this._elementPositionMap = new Map();
        this._treeHadFocus = false;
        this._treeHadFocus = !!_focusedElement;
    }
    provideContent() {
        const debugSession = this._replView.getDebugSession();
        if (!debugSession) {
            return 'No debug session available.';
        }
        const elements = debugSession.getReplElements();
        if (!elements.length) {
            return 'No output in the debug console.';
        }
        if (!this._content) {
            this._updateContent(elements);
        }
        // Content is loaded asynchronously, so we need to check if it's available or fallback to the elements that are already available.
        return this._content ?? elements.map((e) => e.toString(true)).join('\n');
    }
    onClose() {
        this._content = undefined;
        this._elementPositionMap.clear();
        if (this._treeHadFocus) {
            return this._replView.focusTree();
        }
        this._replView.getReplInput().focus();
    }
    onOpen() {
        // Children are resolved async, so we need to update the content when they are resolved.
        this._register(this.onDidResolveChildren(() => {
            this._onDidChangeContent.fire();
            queueMicrotask(() => {
                if (this._focusedElement) {
                    const position = this._elementPositionMap.get(this._focusedElement.getId());
                    if (position) {
                        this._accessibleViewService.setPosition(position, true);
                    }
                }
            });
        }));
    }
    async _updateContent(elements) {
        const dataSource = this._replView.getReplDataSource();
        if (!dataSource) {
            return;
        }
        let line = 1;
        const content = [];
        for (const e of elements) {
            content.push(e.toString().replace(/\n/g, ''));
            this._elementPositionMap.set(e.getId(), new Position(line, 1));
            line++;
            if (dataSource.hasChildren(e)) {
                const childContent = [];
                const children = await dataSource.getChildren(e);
                for (const child of children) {
                    const id = child.getId();
                    if (!this._elementPositionMap.has(id)) {
                        // don't overwrite parent position
                        this._elementPositionMap.set(id, new Position(line, 1));
                    }
                    childContent.push('  ' + child.toString());
                    line++;
                }
                content.push(childContent.join('\n'));
            }
        }
        this._content = content.join('\n');
        this._onDidResolveChildren.fire();
    }
};
ReplOutputAccessibleViewProvider = __decorate([
    __param(2, IAccessibleViewService)
], ReplOutputAccessibleViewProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yZXBsQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUlOLHNCQUFzQixHQUN0QixNQUFNLDhEQUE4RCxDQUFBO0FBS3JFLE9BQU8sRUFBRSxXQUFXLEVBQVEsTUFBTSxXQUFXLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVyRSxNQUFNLE9BQU8sa0JBQWtCO0lBQS9CO1FBQ0MsYUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNiLFNBQUksR0FBRyxjQUFjLENBQUE7UUFDckIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLDJCQUEyQixDQUFDLENBQUE7UUFDeEUsU0FBSSx3Q0FBOEM7SUFZbkQsQ0FBQztJQVhBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsUUFBUSxF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