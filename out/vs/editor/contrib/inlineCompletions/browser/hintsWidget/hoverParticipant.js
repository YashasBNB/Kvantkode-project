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
import * as dom from '../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, } from '../../../../../base/common/observable.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { HoverForeignElementAnchor, RenderedHoverParts, } from '../../../hover/browser/hoverTypes.js';
import { InlineCompletionsController } from '../controller/inlineCompletionsController.js';
import { InlineSuggestionHintsContentWidget } from './inlineCompletionsHintsWidget.js';
import { MarkdownRenderer } from '../../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import * as nls from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { GhostTextView } from '../view/ghostText/ghostTextView.js';
export class InlineCompletionsHover {
    constructor(owner, range, controller) {
        this.owner = owner;
        this.range = range;
        this.controller = controller;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
}
let InlineCompletionsHoverParticipant = class InlineCompletionsHoverParticipant {
    constructor(_editor, _languageService, _openerService, accessibilityService, _instantiationService, _telemetryService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this.accessibilityService = accessibilityService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this.hoverOrdinal = 4;
    }
    suggestHoverAnchor(mouseEvent) {
        const controller = InlineCompletionsController.get(this._editor);
        if (!controller) {
            return null;
        }
        const target = mouseEvent.target;
        if (target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            // handle the case where the mouse is over the view zone
            const viewZoneData = target.detail;
            if (controller.shouldShowHoverAtViewZone(viewZoneData.viewZoneId)) {
                return new HoverForeignElementAnchor(1000, this, Range.fromPositions(this._editor
                    .getModel()
                    .validatePosition(viewZoneData.positionBefore || viewZoneData.position)), mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            // handle the case where the mouse is over the empty portion of a line following ghost text
            if (controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            // handle the case where the mouse is directly over ghost text
            const mightBeForeignElement = target.detail.mightBeForeignElement;
            if (mightBeForeignElement && controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && target.element) {
            const ctx = GhostTextView.getWarningWidgetContext(target.element);
            if (ctx && controller.shouldShowHoverAt(ctx.range)) {
                return new HoverForeignElementAnchor(1000, this, ctx.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        return null;
    }
    computeSync(anchor, lineDecorations) {
        if (this._editor.getOption(64 /* EditorOption.inlineSuggest */).showToolbar !== 'onHover') {
            return [];
        }
        const controller = InlineCompletionsController.get(this._editor);
        if (controller && controller.shouldShowHoverAt(anchor.range)) {
            return [new InlineCompletionsHover(this, anchor.range, controller)];
        }
        return [];
    }
    renderHoverParts(context, hoverParts) {
        const disposables = new DisposableStore();
        const part = hoverParts[0];
        this._telemetryService.publicLog2('inlineCompletionHover.shown');
        if (this.accessibilityService.isScreenReaderOptimized() &&
            !this._editor.getOption(8 /* EditorOption.screenReaderAnnounceInlineSuggestion */)) {
            disposables.add(this.renderScreenReaderText(context, part));
        }
        const model = part.controller.model.get();
        const widgetNode = document.createElement('div');
        context.fragment.appendChild(widgetNode);
        disposables.add(autorunWithStore((reader, store) => {
            const w = store.add(this._instantiationService.createInstance(InlineSuggestionHintsContentWidget.hot.read(reader), this._editor, false, constObservable(null), model.selectedInlineCompletionIndex, model.inlineCompletionsCount, model.activeCommands, model.warning, () => {
                context.onContentsChanged();
            }));
            widgetNode.replaceChildren(w.getDomNode());
        }));
        model.triggerExplicitly();
        const renderedHoverPart = {
            hoverPart: part,
            hoverElement: widgetNode,
            dispose() {
                disposables.dispose();
            },
        };
        return new RenderedHoverParts([renderedHoverPart]);
    }
    getAccessibleContent(hoverPart) {
        return nls.localize('hoverAccessibilityStatusBar', 'There are inline completions here');
    }
    renderScreenReaderText(context, part) {
        const disposables = new DisposableStore();
        const $ = dom.$;
        const markdownHoverElement = $('div.hover-row.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents', { ['aria-live']: 'assertive' }));
        const renderer = new MarkdownRenderer({ editor: this._editor }, this._languageService, this._openerService);
        const render = (code) => {
            const inlineSuggestionAvailable = nls.localize('inlineSuggestionFollows', 'Suggestion:');
            const renderedContents = disposables.add(renderer.render(new MarkdownString().appendText(inlineSuggestionAvailable).appendCodeblock('text', code), {
                asyncRenderCallback: () => {
                    hoverContentsElement.className = 'hover-contents code-hover-contents';
                    context.onContentsChanged();
                },
            }));
            hoverContentsElement.replaceChildren(renderedContents.element);
        };
        disposables.add(autorun((reader) => {
            /** @description update hover */
            const ghostText = part.controller.model.read(reader)?.primaryGhostText.read(reader);
            if (ghostText) {
                const lineText = this._editor.getModel().getLineContent(ghostText.lineNumber);
                render(ghostText.renderForScreenReader(lineText));
            }
            else {
                dom.reset(hoverContentsElement);
            }
        }));
        context.fragment.appendChild(markdownHoverElement);
        return disposables;
    }
};
InlineCompletionsHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IAccessibilityService),
    __param(4, IInstantiationService),
    __param(5, ITelemetryService)
], InlineCompletionsHoverParticipant);
export { InlineCompletionsHoverParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaGludHNXaWRnZXQvaG92ZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUNOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsZUFBZSxHQUNmLE1BQU0sMENBQTBDLENBQUE7QUFPakQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTNFLE9BQU8sRUFHTix5QkFBeUIsRUFNekIsa0JBQWtCLEdBQ2xCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDMUcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlC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