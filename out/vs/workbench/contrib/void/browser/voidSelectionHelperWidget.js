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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNlbGVjdGlvbkhlbHBlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRTZWxlY3Rpb25IZWxwZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU05RSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFeEQsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUE7QUFDbEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFBO0FBTWIsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFDWixTQUFRLFVBQVU7O2FBR0ssT0FBRSxHQUFHLG9DQUFvQyxBQUF2QyxDQUF1QztJQVloRSxZQUNrQixPQUFvQixFQUNkLHFCQUE2RCxFQUM5RCxvQkFBMkQ7UUFFakYsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0csMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtR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