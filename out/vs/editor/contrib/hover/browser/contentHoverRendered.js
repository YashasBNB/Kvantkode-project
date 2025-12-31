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
var RenderedContentHover_1, RenderedContentHoverParts_1;
import { RenderedHoverParts, } from './hoverTypes.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { EditorHoverStatusBar } from './contentHoverStatusBar.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as dom from '../../../../base/browser/dom.js';
import { MarkdownHoverParticipant } from './markdownHoverParticipant.js';
import { HoverColorPickerParticipant } from '../../colorPicker/browser/hoverColorPicker/hoverColorPickerParticipant.js';
import { localize } from '../../../../nls.js';
import { InlayHintsHover } from '../../inlayHints/browser/inlayHintsHover.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let RenderedContentHover = RenderedContentHover_1 = class RenderedContentHover extends Disposable {
    constructor(editor, hoverResult, participants, context, keybindingService, hoverService) {
        super();
        const parts = hoverResult.hoverParts;
        this._renderedHoverParts = this._register(new RenderedContentHoverParts(editor, participants, parts, context, keybindingService, hoverService));
        const contentHoverComputerOptions = hoverResult.options;
        const anchor = contentHoverComputerOptions.anchor;
        const { showAtPosition, showAtSecondaryPosition } = RenderedContentHover_1.computeHoverPositions(editor, anchor.range, parts);
        this.shouldAppearBeforeContent = parts.some((m) => m.isBeforeContent);
        this.showAtPosition = showAtPosition;
        this.showAtSecondaryPosition = showAtSecondaryPosition;
        this.initialMousePosX = anchor.initialMousePosX;
        this.initialMousePosY = anchor.initialMousePosY;
        this.shouldFocus = contentHoverComputerOptions.shouldFocus;
        this.source = contentHoverComputerOptions.source;
    }
    get domNode() {
        return this._renderedHoverParts.domNode;
    }
    get domNodeHasChildren() {
        return this._renderedHoverParts.domNodeHasChildren;
    }
    get focusedHoverPartIndex() {
        return this._renderedHoverParts.focusedHoverPartIndex;
    }
    get hoverPartsCount() {
        return this._renderedHoverParts.hoverPartsCount;
    }
    focusHoverPartWithIndex(index) {
        this._renderedHoverParts.focusHoverPartWithIndex(index);
    }
    getAccessibleWidgetContent() {
        return this._renderedHoverParts.getAccessibleContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._renderedHoverParts.getAccessibleHoverContentAtIndex(index);
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        this._renderedHoverParts.updateHoverVerbosityLevel(action, index, focus);
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._renderedHoverParts.doesHoverAtIndexSupportVerbosityAction(index, action);
    }
    isColorPickerVisible() {
        return this._renderedHoverParts.isColorPickerVisible();
    }
    static computeHoverPositions(editor, anchorRange, hoverParts) {
        let startColumnBoundary = 1;
        if (editor.hasModel()) {
            // Ensure the range is on the current view line
            const viewModel = editor._getViewModel();
            const coordinatesConverter = viewModel.coordinatesConverter;
            const anchorViewRange = coordinatesConverter.convertModelRangeToViewRange(anchorRange);
            const anchorViewMinColumn = viewModel.getLineMinColumn(anchorViewRange.startLineNumber);
            const anchorViewRangeStart = new Position(anchorViewRange.startLineNumber, anchorViewMinColumn);
            startColumnBoundary =
                coordinatesConverter.convertViewPositionToModelPosition(anchorViewRangeStart).column;
        }
        // The anchor range is always on a single line
        const anchorStartLineNumber = anchorRange.startLineNumber;
        let secondaryPositionColumn = anchorRange.startColumn;
        let forceShowAtRange;
        for (const hoverPart of hoverParts) {
            const hoverPartRange = hoverPart.range;
            const hoverPartRangeOnAnchorStartLine = hoverPartRange.startLineNumber === anchorStartLineNumber;
            const hoverPartRangeOnAnchorEndLine = hoverPartRange.endLineNumber === anchorStartLineNumber;
            const hoverPartRangeIsOnAnchorLine = hoverPartRangeOnAnchorStartLine && hoverPartRangeOnAnchorEndLine;
            if (hoverPartRangeIsOnAnchorLine) {
                // this message has a range that is completely sitting on the line of the anchor
                const hoverPartStartColumn = hoverPartRange.startColumn;
                const minSecondaryPositionColumn = Math.min(secondaryPositionColumn, hoverPartStartColumn);
                secondaryPositionColumn = Math.max(minSecondaryPositionColumn, startColumnBoundary);
            }
            if (hoverPart.forceShowAtRange) {
                forceShowAtRange = hoverPartRange;
            }
        }
        let showAtPosition;
        let showAtSecondaryPosition;
        if (forceShowAtRange) {
            const forceShowAtPosition = forceShowAtRange.getStartPosition();
            showAtPosition = forceShowAtPosition;
            showAtSecondaryPosition = forceShowAtPosition;
        }
        else {
            showAtPosition = anchorRange.getStartPosition();
            showAtSecondaryPosition = new Position(anchorStartLineNumber, secondaryPositionColumn);
        }
        return {
            showAtPosition,
            showAtSecondaryPosition,
        };
    }
};
RenderedContentHover = RenderedContentHover_1 = __decorate([
    __param(4, IKeybindingService),
    __param(5, IHoverService)
], RenderedContentHover);
export { RenderedContentHover };
class RenderedStatusBar {
    constructor(fragment, _statusBar) {
        this._statusBar = _statusBar;
        fragment.appendChild(this._statusBar.hoverElement);
    }
    get hoverElement() {
        return this._statusBar.hoverElement;
    }
    get actions() {
        return this._statusBar.actions;
    }
    dispose() {
        this._statusBar.dispose();
    }
}
let RenderedContentHoverParts = class RenderedContentHoverParts extends Disposable {
    static { RenderedContentHoverParts_1 = this; }
    static { this._DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'content-hover-highlight',
        className: 'hoverHighlight',
    }); }
    constructor(editor, participants, hoverParts, context, keybindingService, hoverService) {
        super();
        this._renderedParts = [];
        this._focusedHoverPartIndex = -1;
        this._context = context;
        this._fragment = document.createDocumentFragment();
        this._register(this._renderParts(participants, hoverParts, context, keybindingService, hoverService));
        this._register(this._registerListenersOnRenderedParts());
        this._register(this._createEditorDecorations(editor, hoverParts));
        this._updateMarkdownAndColorParticipantInfo(participants);
    }
    _createEditorDecorations(editor, hoverParts) {
        if (hoverParts.length === 0) {
            return Disposable.None;
        }
        let highlightRange = hoverParts[0].range;
        for (const hoverPart of hoverParts) {
            const hoverPartRange = hoverPart.range;
            highlightRange = Range.plusRange(highlightRange, hoverPartRange);
        }
        const highlightDecoration = editor.createDecorationsCollection();
        highlightDecoration.set([
            {
                range: highlightRange,
                options: RenderedContentHoverParts_1._DECORATION_OPTIONS,
            },
        ]);
        return toDisposable(() => {
            highlightDecoration.clear();
        });
    }
    _renderParts(participants, hoverParts, hoverContext, keybindingService, hoverService) {
        const statusBar = new EditorHoverStatusBar(keybindingService, hoverService);
        const hoverRenderingContext = {
            fragment: this._fragment,
            statusBar,
            ...hoverContext,
        };
        const disposables = new DisposableStore();
        disposables.add(statusBar);
        for (const participant of participants) {
            const renderedHoverParts = this._renderHoverPartsForParticipant(hoverParts, participant, hoverRenderingContext);
            disposables.add(renderedHoverParts);
            for (const renderedHoverPart of renderedHoverParts.renderedHoverParts) {
                this._renderedParts.push({
                    type: 'hoverPart',
                    participant,
                    hoverPart: renderedHoverPart.hoverPart,
                    hoverElement: renderedHoverPart.hoverElement,
                });
            }
        }
        const renderedStatusBar = this._renderStatusBar(this._fragment, statusBar);
        if (renderedStatusBar) {
            disposables.add(renderedStatusBar);
            this._renderedParts.push({
                type: 'statusBar',
                hoverElement: renderedStatusBar.hoverElement,
                actions: renderedStatusBar.actions,
            });
        }
        return disposables;
    }
    _renderHoverPartsForParticipant(hoverParts, participant, hoverRenderingContext) {
        const hoverPartsForParticipant = hoverParts.filter((hoverPart) => hoverPart.owner === participant);
        const hasHoverPartsForParticipant = hoverPartsForParticipant.length > 0;
        if (!hasHoverPartsForParticipant) {
            return new RenderedHoverParts([]);
        }
        return participant.renderHoverParts(hoverRenderingContext, hoverPartsForParticipant);
    }
    _renderStatusBar(fragment, statusBar) {
        if (!statusBar.hasContent) {
            return undefined;
        }
        return new RenderedStatusBar(fragment, statusBar);
    }
    _registerListenersOnRenderedParts() {
        const disposables = new DisposableStore();
        this._renderedParts.forEach((renderedPart, index) => {
            const element = renderedPart.hoverElement;
            element.tabIndex = 0;
            disposables.add(dom.addDisposableListener(element, dom.EventType.FOCUS_IN, (event) => {
                event.stopPropagation();
                this._focusedHoverPartIndex = index;
            }));
            disposables.add(dom.addDisposableListener(element, dom.EventType.FOCUS_OUT, (event) => {
                event.stopPropagation();
                this._focusedHoverPartIndex = -1;
            }));
        });
        return disposables;
    }
    _updateMarkdownAndColorParticipantInfo(participants) {
        const markdownHoverParticipant = participants.find((p) => {
            return p instanceof MarkdownHoverParticipant && !(p instanceof InlayHintsHover);
        });
        if (markdownHoverParticipant) {
            this._markdownHoverParticipant = markdownHoverParticipant;
        }
        this._colorHoverParticipant = participants.find((p) => p instanceof HoverColorPickerParticipant);
    }
    focusHoverPartWithIndex(index) {
        if (index < 0 || index >= this._renderedParts.length) {
            return;
        }
        this._renderedParts[index].hoverElement.focus();
    }
    getAccessibleContent() {
        const content = [];
        for (let i = 0; i < this._renderedParts.length; i++) {
            content.push(this.getAccessibleHoverContentAtIndex(i));
        }
        return content.join('\n\n');
    }
    getAccessibleHoverContentAtIndex(index) {
        const renderedPart = this._renderedParts[index];
        if (!renderedPart) {
            return '';
        }
        if (renderedPart.type === 'statusBar') {
            const statusBarDescription = [
                localize('hoverAccessibilityStatusBar', 'This is a hover status bar.'),
            ];
            for (const action of renderedPart.actions) {
                const keybinding = action.actionKeybindingLabel;
                if (keybinding) {
                    statusBarDescription.push(localize('hoverAccessibilityStatusBarActionWithKeybinding', 'It has an action with label {0} and keybinding {1}.', action.actionLabel, keybinding));
                }
                else {
                    statusBarDescription.push(localize('hoverAccessibilityStatusBarActionWithoutKeybinding', 'It has an action with label {0}.', action.actionLabel));
                }
            }
            return statusBarDescription.join('\n');
        }
        return renderedPart.participant.getAccessibleContent(renderedPart.hoverPart);
    }
    async updateHoverVerbosityLevel(action, index, focus) {
        if (!this._markdownHoverParticipant) {
            return;
        }
        let rangeOfIndicesToUpdate;
        if (index >= 0) {
            rangeOfIndicesToUpdate = { start: index, endExclusive: index + 1 };
        }
        else {
            rangeOfIndicesToUpdate = this._findRangeOfMarkdownHoverParts(this._markdownHoverParticipant);
        }
        for (let i = rangeOfIndicesToUpdate.start; i < rangeOfIndicesToUpdate.endExclusive; i++) {
            const normalizedMarkdownHoverIndex = this._normalizedIndexToMarkdownHoverIndexRange(this._markdownHoverParticipant, i);
            if (normalizedMarkdownHoverIndex === undefined) {
                continue;
            }
            const renderedPart = await this._markdownHoverParticipant.updateMarkdownHoverVerbosityLevel(action, normalizedMarkdownHoverIndex);
            if (!renderedPart) {
                continue;
            }
            this._renderedParts[i] = {
                type: 'hoverPart',
                participant: this._markdownHoverParticipant,
                hoverPart: renderedPart.hoverPart,
                hoverElement: renderedPart.hoverElement,
            };
        }
        if (focus) {
            if (index >= 0) {
                this.focusHoverPartWithIndex(index);
            }
            else {
                this._context.focus();
            }
        }
        this._context.onContentsChanged();
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        if (!this._markdownHoverParticipant) {
            return false;
        }
        const normalizedMarkdownHoverIndex = this._normalizedIndexToMarkdownHoverIndexRange(this._markdownHoverParticipant, index);
        if (normalizedMarkdownHoverIndex === undefined) {
            return false;
        }
        return this._markdownHoverParticipant.doesMarkdownHoverAtIndexSupportVerbosityAction(normalizedMarkdownHoverIndex, action);
    }
    isColorPickerVisible() {
        return this._colorHoverParticipant?.isColorPickerVisible() ?? false;
    }
    _normalizedIndexToMarkdownHoverIndexRange(markdownHoverParticipant, index) {
        const renderedPart = this._renderedParts[index];
        if (!renderedPart || renderedPart.type !== 'hoverPart') {
            return undefined;
        }
        const isHoverPartMarkdownHover = renderedPart.participant === markdownHoverParticipant;
        if (!isHoverPartMarkdownHover) {
            return undefined;
        }
        const firstIndexOfMarkdownHovers = this._renderedParts.findIndex((renderedPart) => renderedPart.type === 'hoverPart' && renderedPart.participant === markdownHoverParticipant);
        if (firstIndexOfMarkdownHovers === -1) {
            throw new BugIndicatingError();
        }
        return index - firstIndexOfMarkdownHovers;
    }
    _findRangeOfMarkdownHoverParts(markdownHoverParticipant) {
        const copiedRenderedParts = this._renderedParts.slice();
        const firstIndexOfMarkdownHovers = copiedRenderedParts.findIndex((renderedPart) => renderedPart.type === 'hoverPart' && renderedPart.participant === markdownHoverParticipant);
        const inversedLastIndexOfMarkdownHovers = copiedRenderedParts
            .reverse()
            .findIndex((renderedPart) => renderedPart.type === 'hoverPart' &&
            renderedPart.participant === markdownHoverParticipant);
        const lastIndexOfMarkdownHovers = inversedLastIndexOfMarkdownHovers >= 0
            ? copiedRenderedParts.length - inversedLastIndexOfMarkdownHovers
            : inversedLastIndexOfMarkdownHovers;
        return { start: firstIndexOfMarkdownHovers, endExclusive: lastIndexOfMarkdownHovers + 1 };
    }
    get domNode() {
        return this._fragment;
    }
    get domNodeHasChildren() {
        return this._fragment.hasChildNodes();
    }
    get focusedHoverPartIndex() {
        return this._focusedHoverPartIndex;
    }
    get hoverPartsCount() {
        return this._renderedParts.length;
    }
};
RenderedContentHoverParts = RenderedContentHoverParts_1 = __decorate([
    __param(4, IKeybindingService),
    __param(5, IHoverService)
], RenderedContentHoverParts);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyUmVuZGVyZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2NvbnRlbnRIb3ZlclJlbmRlcmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBTU4sa0JBQWtCLEdBQ2xCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBR3BFLElBQU0sb0JBQW9CLDRCQUExQixNQUFNLG9CQUFxQixTQUFRLFVB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