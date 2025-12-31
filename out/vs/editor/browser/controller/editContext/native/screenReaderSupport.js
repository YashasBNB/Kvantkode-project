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
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { IAccessibilityService, } from '../../../../../platform/accessibility/common/accessibility.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Selection } from '../../../../common/core/selection.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import { ariaLabelForScreenReaderContent, PagedScreenReaderStrategy, } from '../screenReaderUtils.js';
let ScreenReaderSupport = class ScreenReaderSupport {
    constructor(_domNode, _context, _keybindingService, _accessibilityService) {
        this._domNode = _domNode;
        this._context = _context;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        // Configuration values
        this._contentLeft = 1;
        this._contentWidth = 1;
        this._contentHeight = 1;
        this._divWidth = 1;
        this._lineHeight = 1;
        this._accessibilityPageSize = 1;
        this._ignoreSelectionChangeTime = 0;
        this._primarySelection = new Selection(1, 1, 1, 1);
        this._primaryCursorVisibleRange = null;
        this._updateConfigurationSettings();
        this._updateDomAttributes();
    }
    setIgnoreSelectionChangeTime(reason) {
        this._ignoreSelectionChangeTime = Date.now();
    }
    getIgnoreSelectionChangeTime() {
        return this._ignoreSelectionChangeTime;
    }
    resetSelectionChangeTime() {
        this._ignoreSelectionChangeTime = 0;
    }
    onConfigurationChanged(e) {
        this._updateConfigurationSettings();
        this._updateDomAttributes();
        if (e.hasChanged(2 /* EditorOption.accessibilitySupport */)) {
            this.writeScreenReaderContent();
        }
    }
    _updateConfigurationSettings() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const wrappingColumn = layoutInfo.wrappingColumn;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._contentHeight = layoutInfo.height;
        this._fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._accessibilityPageSize = options.get(3 /* EditorOption.accessibilityPageSize */);
        this._divWidth = Math.round(wrappingColumn * this._fontInfo.typicalHalfwidthCharacterWidth);
    }
    _updateDomAttributes() {
        const options = this._context.configuration.options;
        this._domNode.domNode.setAttribute('role', 'textbox');
        this._domNode.domNode.setAttribute('aria-required', options.get(5 /* EditorOption.ariaRequired */) ? 'true' : 'false');
        this._domNode.domNode.setAttribute('aria-multiline', 'true');
        this._domNode.domNode.setAttribute('aria-autocomplete', options.get(96 /* EditorOption.readOnly */) ? 'none' : 'both');
        this._domNode.domNode.setAttribute('aria-roledescription', localize('editor', 'editor'));
        this._domNode.domNode.setAttribute('aria-label', ariaLabelForScreenReaderContent(options, this._keybindingService));
        const tabSize = this._context.viewModel.model.getOptions().tabSize;
        const spaceWidth = options.get(52 /* EditorOption.fontInfo */).spaceWidth;
        this._domNode.domNode.style.tabSize = `${tabSize * spaceWidth}px`;
        const wordWrapOverride2 = options.get(142 /* EditorOption.wordWrapOverride2 */);
        const wordWrapValue = wordWrapOverride2 !== 'inherit' ? wordWrapOverride2 : options.get(137 /* EditorOption.wordWrap */);
        this._domNode.domNode.style.textWrap = wordWrapValue === 'off' ? 'nowrap' : 'wrap';
    }
    onCursorStateChanged(e) {
        this._primarySelection = e.selections[0] ?? new Selection(1, 1, 1, 1);
    }
    prepareRender(ctx) {
        this.writeScreenReaderContent();
        this._primaryCursorVisibleRange = ctx.visibleRangeForPosition(this._primarySelection.getPosition());
    }
    render(ctx) {
        if (!this._screenReaderContentState) {
            return;
        }
        if (!this._primaryCursorVisibleRange) {
            // The primary cursor is outside the viewport => place textarea to the top left
            this._renderAtTopLeft();
            return;
        }
        const editorScrollLeft = this._context.viewLayout.getCurrentScrollLeft();
        const left = this._contentLeft + this._primaryCursorVisibleRange.left - editorScrollLeft;
        if (left < this._contentLeft || left > this._contentLeft + this._contentWidth) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        const editorScrollTop = this._context.viewLayout.getCurrentScrollTop();
        const positionLineNumber = this._primarySelection.positionLineNumber;
        const top = this._context.viewLayout.getVerticalOffsetForLineNumber(positionLineNumber) - editorScrollTop;
        if (top < 0 || top > this._contentHeight) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        const offsetForStartPositionWithinEditor = this._context.viewLayout.getVerticalOffsetForLineNumber(this._screenReaderContentState.startPositionWithinEditor.lineNumber);
        const offsetForPositionLineNumber = this._context.viewLayout.getVerticalOffsetForLineNumber(positionLineNumber);
        const scrollTop = offsetForPositionLineNumber - offsetForStartPositionWithinEditor;
        this._doRender(scrollTop, top, this._contentLeft, this._divWidth, this._lineHeight);
    }
    _renderAtTopLeft() {
        this._doRender(0, 0, 0, this._contentWidth, 1);
    }
    _doRender(scrollTop, top, left, width, height) {
        // For correct alignment of the screen reader content, we need to apply the correct font
        applyFontInfo(this._domNode, this._fontInfo);
        this._domNode.setTop(top);
        this._domNode.setLeft(left);
        this._domNode.setWidth(width);
        this._domNode.setHeight(height);
        this._domNode.domNode.scrollTop = scrollTop;
    }
    setAriaOptions(options) {
        if (options.activeDescendant) {
            this._domNode.setAttribute('aria-haspopup', 'true');
            this._domNode.setAttribute('aria-autocomplete', 'list');
            this._domNode.setAttribute('aria-activedescendant', options.activeDescendant);
        }
        else {
            this._domNode.setAttribute('aria-haspopup', 'false');
            this._domNode.setAttribute('aria-autocomplete', 'both');
            this._domNode.removeAttribute('aria-activedescendant');
        }
        if (options.role) {
            this._domNode.setAttribute('role', options.role);
        }
    }
    writeScreenReaderContent() {
        const focusedElement = getActiveWindow().document.activeElement;
        if (!focusedElement || focusedElement !== this._domNode.domNode) {
            return;
        }
        const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (isScreenReaderOptimized) {
            this._screenReaderContentState = this._getScreenReaderContentState();
            if (this._domNode.domNode.textContent !== this._screenReaderContentState.value) {
                this.setIgnoreSelectionChangeTime('setValue');
                this._domNode.domNode.textContent = this._screenReaderContentState.value;
            }
            this._setSelectionOfScreenReaderContent(this._screenReaderContentState.selectionStart, this._screenReaderContentState.selectionEnd);
        }
        else {
            this._screenReaderContentState = undefined;
            this.setIgnoreSelectionChangeTime('setValue');
            this._domNode.domNode.textContent = '';
        }
    }
    get screenReaderContentState() {
        return this._screenReaderContentState;
    }
    _getScreenReaderContentState() {
        const simpleModel = {
            getLineCount: () => {
                return this._context.viewModel.getLineCount();
            },
            getLineMaxColumn: (lineNumber) => {
                return this._context.viewModel.getLineMaxColumn(lineNumber);
            },
            getValueInRange: (range, eol) => {
                return this._context.viewModel.getValueInRange(range, eol);
            },
            getValueLengthInRange: (range, eol) => {
                return this._context.viewModel.getValueLengthInRange(range, eol);
            },
            modifyPosition: (position, offset) => {
                return this._context.viewModel.modifyPosition(position, offset);
            },
        };
        return PagedScreenReaderStrategy.fromEditorSelection(simpleModel, this._primarySelection, this._accessibilityPageSize, this._accessibilityService.getAccessibilitySupport() === 0 /* AccessibilitySupport.Unknown */);
    }
    _setSelectionOfScreenReaderContent(selectionOffsetStart, selectionOffsetEnd) {
        const activeDocument = getActiveWindow().document;
        const activeDocumentSelection = activeDocument.getSelection();
        if (!activeDocumentSelection) {
            return;
        }
        const textContent = this._domNode.domNode.firstChild;
        if (!textContent) {
            return;
        }
        const range = new globalThis.Range();
        range.setStart(textContent, selectionOffsetStart);
        range.setEnd(textContent, selectionOffsetEnd);
        this.setIgnoreSelectionChangeTime('setRange');
        activeDocumentSelection.removeAllRanges();
        activeDocumentSelection.addRange(range);
    }
};
ScreenReaderSupport = __decorate([
    __param(2, IKeybindingService),
    __param(3, IAccessibilityService)
], ScreenReaderSupport);
export { ScreenReaderSupport };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyU3VwcG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL3NjcmVlblJlYWRlclN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFLNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBT2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU85RCxPQUFPLEVBQ04sK0JBQStCLEVBRS9CLHlCQUF5QixHQUV6QixNQUFNLHlCQUF5QixDQUFBO0FBRXpCLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBZS9CLFlBQ2tCLFFBQWtDLEVBQ2xDLFFBQXFCLEVBQ2xCLGtCQUF1RCxFQUNwRCxxQkFBNkQ7UUFIbkUsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDbEMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWxCckYsdUJBQXVCO1FBQ2YsaUJBQVksR0FBVyxDQUFDLENBQUE7UUFDeEIsa0JBQWEsR0FBVyxDQUFDLENBQUE7UUFDekIsbUJBQWMsR0FBVyxDQUFDLENBQUE7UUFDMUIsY0FBUyxHQUFXLENBQUMsQ0FBQTtRQUNyQixnQkFBVyxH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