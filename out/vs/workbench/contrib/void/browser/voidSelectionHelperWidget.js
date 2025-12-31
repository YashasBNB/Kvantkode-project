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
var SelectionHelperContribution_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import * as dom from '../../../../base/browser/dom.js';
import { mountVoidSelectionHelper } from './react/out/void-editor-widgets-tsx/index.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { getLengthOfTextPx } from './editCodeService.js';
const minDistanceFromRightPx = 400;
const minLeftPx = 60;
let SelectionHelperContribution = class SelectionHelperContribution extends Disposable {
    static { SelectionHelperContribution_1 = this; }
    static { this.ID = 'editor.contrib.voidSelectionHelper'; }
    constructor(_editor, _instantiationService, _voidSettingsService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._voidSettingsService = _voidSettingsService;
        this._rerender = () => { };
        this._rerenderKey = 0;
        this._reactComponentDisposable = null;
        // internal
        this._isVisible = false;
        this._lastSelection = null;
        // Create the container element for React component
        const { root, content } = dom.h('div@root', [dom.h('div@content', [])]);
        // Set styles for container
        root.style.position = 'absolute';
        root.style.display = 'none'; // Start hidden
        root.style.pointerEvents = 'none';
        root.style.marginLeft = '16px';
        // Initialize React component
        this._instantiationService.invokeFunction((accessor) => {
            if (this._reactComponentDisposable) {
                this._reactComponentDisposable.dispose();
            }
            const res = mountVoidSelectionHelper(content, accessor);
            if (!res)
                return;
            this._reactComponentDisposable = res;
            this._rerender = res.rerender;
            this._register(this._reactComponentDisposable);
        });
        this._rootHTML = root;
        // Register as overlay widget
        this._editor.addOverlayWidget(this);
        // Use scheduler to debounce showing widget
        this._showScheduler = new RunOnceScheduler(() => {
            if (this._lastSelection) {
                this._showHelperForSelection(this._lastSelection);
            }
        }, 50);
        // Register event listeners
        this._register(this._editor.onDidChangeCursorSelection((e) => this._onSelectionChange(e)));
        // Add a flag to track if mouse is over the widget
        let isMouseOverWidget = false;
        this._rootHTML.addEventListener('mouseenter', () => {
            isMouseOverWidget = true;
        });
        this._rootHTML.addEventListener('mouseleave', () => {
            isMouseOverWidget = false;
        });
        // Only hide helper when text editor loses focus and mouse is not over the widget
        this._register(this._editor.onDidBlurEditorText(() => {
            if (!isMouseOverWidget) {
                this._hideHelper();
            }
        }));
        this._register(this._editor.onDidScrollChange(() => this._updatePositionIfVisible()));
        this._register(this._editor.onDidLayoutChange(() => this._updatePositionIfVisible()));
    }
    // IOverlayWidget implementation
    getId() {
        return SelectionHelperContribution_1.ID;
    }
    getDomNode() {
        return this._rootHTML;
    }
    getPosition() {
        return null; // We position manually
    }
    _onSelectionChange(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getModel().uri.scheme !== 'file') {
            return;
        }
        const selection = this._editor.getSelection();
        if (!selection || selection.isEmpty()) {
            this._hideHelper();
            return;
        }
        // Get selection text to check if it's worth showing the helper
        const text = this._editor.getModel().getValueInRange(selection);
        if (text.length < 3) {
            this._hideHelper();
            return;
        }
        // Store selection
        this._lastSelection = new Selection(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
        this._showScheduler.schedule();
    }
    // Update the _showHelperForSelection method to work with the React component
    _showHelperForSelection(selection) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        // get the longest length of the nearest neighbors of the target
        const { tabSize: numSpacesInTab } = model.getFormattingOptions();
        const spaceWidth = this._editor.getOption(52 /* EditorOption.fontInfo */).spaceWidth;
        const tabWidth = numSpacesInTab * spaceWidth;
        const numLinesModel = model.getLineCount();
        // Calculate right edge of visible editor area
        const editorWidthPx = this._editor.getLayoutInfo().width;
        const maxLeftPx = editorWidthPx - minDistanceFromRightPx;
        // returns the position where the box should go on the targetLine
        const getBoxPosition = (targetLine) => {
            const targetPosition = this._editor.getScrolledVisiblePosition({
                lineNumber: targetLine,
                column: 1,
            }) ?? { left: 0, top: 0 };
            const { top: targetTop, left: targetLeft } = targetPosition;
            let targetWidth = 0;
            for (let i = targetLine; i <= targetLine + 1; i++) {
                // if not in range, continue
                if (!(i >= 1) || !(i <= numLinesModel))
                    continue;
                const content = model.getLineContent(i);
                const currWidth = getLengthOfTextPx({
                    tabWidth,
                    spaceWidth,
                    content,
                });
                targetWidth = Math.max(targetWidth, currWidth);
            }
            return {
                top: targetTop,
                left: targetLeft + targetWidth,
            };
        };
        // Calculate the middle line of the selection
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;
        // const middleLine = Math.floor(startLine + (endLine - startLine) / 2);
        const targetLine = endLine - startLine + 1 <= 2 ? startLine : startLine + 2;
        let boxPos = getBoxPosition(targetLine);
        // if the position of the box is too far to the right, keep searching for a good position
        const lineDeltasToTry = [-1, -2, -3, 1, 2, 3];
        if (boxPos.left > maxLeftPx) {
            for (const lineDelta of lineDeltasToTry) {
                boxPos = getBoxPosition(targetLine + lineDelta);
                if (boxPos.left <= maxLeftPx) {
                    break;
                }
            }
        }
        if (boxPos.left > maxLeftPx) {
            // if still not found, make it 2 lines before
            boxPos = getBoxPosition(targetLine - 2);
        }
        // Position the helper element at the end of the middle line but ensure it's visible
        const xPosition = Math.max(Math.min(boxPos.left, maxLeftPx), minLeftPx);
        const yPosition = boxPos.top;
        // Update the React component position
        this._rootHTML.style.left = `${xPosition}px`;
        this._rootHTML.style.top = `${yPosition}px`;
        this._rootHTML.style.display = 'flex'; // Show the container
        this._isVisible = true;
        // rerender
        const enabled = this._voidSettingsService.state.globalSettings.showInlineSuggestions &&
            this._editor.hasTextFocus(); // needed since VS Code counts unfocused selections as selections, which causes this to rerender when it shouldnt (bad ux)
        if (enabled) {
            this._rerender({ rerenderKey: this._rerenderKey });
            this._rerenderKey = (this._rerenderKey + 1) % 2;
            // this._reactComponentRerender();
        }
    }
    _hideHelper() {
        this._rootHTML.style.display = 'none';
        this._isVisible = false;
        this._lastSelection = null;
    }
    _updatePositionIfVisible() {
        if (!this._isVisible || !this._lastSelection || !this._editor.hasModel()) {
            return;
        }
        this._showHelperForSelection(this._lastSelection);
    }
    dispose() {
        this._hideHelper();
        if (this._reactComponentDisposable) {
            this._reactComponentDisposable.dispose();
        }
        this._editor.removeOverlayWidget(this);
        this._showScheduler.dispose();
        super.dispose();
    }
};
SelectionHelperContribution = SelectionHelperContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IVoidSettingsService)
], SelectionHelperContribution);
export { SelectionHelperContribution };
// Register the contribution
registerEditorContribution(SelectionHelperContribution.ID, SelectionHelperContribution, 0 /* EditorContributionInstantiation.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNlbGVjdGlvbkhlbHBlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkU2VsZWN0aW9uSGVscGVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFNOUUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBR3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXhELE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFBO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQTtBQU1iLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQ1osU0FBUSxVQUFVOzthQUdLLE9BQUUsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBdUM7SUFZaEUsWUFDa0IsT0FBb0IsRUFDZCxxQkFBNkQsRUFDOUQsb0JBQTJEO1FBRWpGLEtBQUssRUFBRSxDQUFBO1FBSlUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDN0Ms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