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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3JlcGxBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBSU4sc0JBQXNCLEdBQ3RCLE1BQU0sOERBQThELENBQUE7QUFLckUsT0FBTyxFQUFFLFdBQVcsRUFBUSxNQUFNLFdBQVcsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXJFLE1BQU0sT0FBTyxrQkFBa0I7SUFBL0I7UUFDQyxhQUFRLEdBQUcsRUFBRSxDQUFBO1FBQ2IsU0FBSSxHQUFHLGNBQWMsQ0FBQTtRQUNyQixTQUFJLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtRQUN4RSxTQUFJLHdDQUE4QztJQVluRCxDQUFDO0lBWEEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbEUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxR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