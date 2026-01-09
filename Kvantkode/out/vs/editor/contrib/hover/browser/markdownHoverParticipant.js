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
import * as dom from '../../../../base/browser/dom.js';
import { asArray, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isEmptyMarkdownString, MarkdownString, } from '../../../../base/common/htmlContent.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, } from './hoverActionIds.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { RenderedHoverParts, } from './hoverTypes.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { HoverVerbosityAction, } from '../../../common/languages.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ClickAction, KeyDownAction, } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { getHoverProviderResultsAsAsyncIterable } from './getHover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
const $ = dom.$;
const increaseHoverVerbosityIcon = registerIcon('hover-increase-verbosity', Codicon.add, nls.localize('increaseHoverVerbosity', 'Icon for increaseing hover verbosity.'));
const decreaseHoverVerbosityIcon = registerIcon('hover-decrease-verbosity', Codicon.remove, nls.localize('decreaseHoverVerbosity', 'Icon for decreasing hover verbosity.'));
export class MarkdownHover {
    constructor(owner, range, contents, isBeforeContent, ordinal, source = undefined) {
        this.owner = owner;
        this.range = range;
        this.contents = contents;
        this.isBeforeContent = isBeforeContent;
        this.ordinal = ordinal;
        this.source = source;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
}
class HoverSource {
    constructor(hover, hoverProvider, hoverPosition) {
        this.hover = hover;
        this.hoverProvider = hoverProvider;
        this.hoverPosition = hoverPosition;
    }
    supportsVerbosityAction(hoverVerbosityAction) {
        switch (hoverVerbosityAction) {
            case HoverVerbosityAction.Increase:
                return this.hover.canIncreaseVerbosity ?? false;
            case HoverVerbosityAction.Decrease:
                return this.hover.canDecreaseVerbosity ?? false;
        }
    }
}
let MarkdownHoverParticipant = class MarkdownHoverParticipant {
    constructor(_editor, _languageService, _openerService, _configurationService, _languageFeaturesService, _keybindingService, _hoverService, _commandService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._commandService = _commandService;
        this.hoverOrdinal = 3;
    }
    createLoadingMessage(anchor) {
        return new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(nls.localize('modesContentHover.loading', 'Loading...'))], false, 2000);
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        let index = 1000;
        const lineLength = model.getLineLength(lineNumber);
        const languageId = model.getLanguageIdAtPosition(anchor.range.startLineNumber, anchor.range.startColumn);
        const stopRenderingLineAfter = this._editor.getOption(122 /* EditorOption.stopRenderingLineAfter */);
        const maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: languageId,
        });
        let stopRenderingMessage = false;
        if (stopRenderingLineAfter >= 0 &&
            lineLength > stopRenderingLineAfter &&
            anchor.range.startColumn >= stopRenderingLineAfter) {
            stopRenderingMessage = true;
            result.push(new MarkdownHover(this, anchor.range, [
                {
                    value: nls.localize('stopped rendering', 'Rendering paused for long line for performance reasons. This can be configured via `editor.stopRenderingLineAfter`.'),
                },
            ], false, index++));
        }
        if (!stopRenderingMessage &&
            typeof maxTokenizationLineLength === 'number' &&
            lineLength >= maxTokenizationLineLength) {
            result.push(new MarkdownHover(this, anchor.range, [
                {
                    value: nls.localize('too many characters', 'Tokenization is skipped for long lines for performance reasons. This can be configured via `editor.maxTokenizationLineLength`.'),
                },
            ], false, index++));
        }
        let isBeforeContent = false;
        for (const d of lineDecorations) {
            const startColumn = d.range.startLineNumber === lineNumber ? d.range.startColumn : 1;
            const endColumn = d.range.endLineNumber === lineNumber ? d.range.endColumn : maxColumn;
            const hoverMessage = d.options.hoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            if (d.options.beforeContentClassName) {
                isBeforeContent = true;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkdownHover(this, range, asArray(hoverMessage), isBeforeContent, index++));
        }
        return result;
    }
    computeAsync(anchor, lineDecorations, source, token) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return AsyncIterableObject.EMPTY;
        }
        const model = this._editor.getModel();
        const hoverProviderRegistry = this._languageFeaturesService.hoverProvider;
        if (!hoverProviderRegistry.has(model)) {
            return AsyncIterableObject.EMPTY;
        }
        const markdownHovers = this._getMarkdownHovers(hoverProviderRegistry, model, anchor, token);
        return markdownHovers;
    }
    _getMarkdownHovers(hoverProviderRegistry, model, anchor, token) {
        const position = anchor.range.getStartPosition();
        const hoverProviderResults = getHoverProviderResultsAsAsyncIterable(hoverProviderRegistry, model, position, token);
        const markdownHovers = hoverProviderResults
            .filter((item) => !isEmptyMarkdownString(item.hover.contents))
            .map((item) => {
            const range = item.hover.range ? Range.lift(item.hover.range) : anchor.range;
            const hoverSource = new HoverSource(item.hover, item.provider, position);
            return new MarkdownHover(this, range, item.hover.contents, false, item.ordinal, hoverSource);
        });
        return markdownHovers;
    }
    renderHoverParts(context, hoverParts) {
        this._renderedHoverParts = new MarkdownRenderedHoverParts(hoverParts, context.fragment, this, this._editor, this._languageService, this._openerService, this._commandService, this._keybindingService, this._hoverService, this._configurationService, context.onContentsChanged);
        return this._renderedHoverParts;
    }
    handleScroll(e) {
        this._renderedHoverParts?.handleScroll(e);
    }
    getAccessibleContent(hoverPart) {
        return this._renderedHoverParts?.getAccessibleContent(hoverPart) ?? '';
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        return (this._renderedHoverParts?.doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) ??
            false);
    }
    updateMarkdownHoverVerbosityLevel(action, index) {
        return Promise.resolve(this._renderedHoverParts?.updateMarkdownHoverPartVerbosityLevel(action, index));
    }
};
MarkdownHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IKeybindingService),
    __param(6, IHoverService),
    __param(7, ICommandService)
], MarkdownHoverParticipant);
export { MarkdownHoverParticipant };
class RenderedMarkdownHoverPart {
    constructor(hoverPart, hoverElement, disposables, actionsContainer) {
        this.hoverPart = hoverPart;
        this.hoverElement = hoverElement;
        this.disposables = disposables;
        this.actionsContainer = actionsContainer;
    }
    get hoverAccessibleContent() {
        return this.hoverElement.innerText.trim();
    }
    dispose() {
        this.disposables.dispose();
    }
}
class MarkdownRenderedHoverParts {
    constructor(hoverParts, hoverPartsContainer, _hoverParticipant, _editor, _languageService, _openerService, _commandService, _keybindingService, _hoverService, _configurationService, _onFinishedRendering) {
        this._hoverParticipant = _hoverParticipant;
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this._onFinishedRendering = _onFinishedRendering;
        this._ongoingHoverOperations = new Map();
        this._disposables = new DisposableStore();
        this.renderedHoverParts = this._renderHoverParts(hoverParts, hoverPartsContainer, this._onFinishedRendering);
        this._disposables.add(toDisposable(() => {
            this.renderedHoverParts.forEach((renderedHoverPart) => {
                renderedHoverPart.dispose();
            });
            this._ongoingHoverOperations.forEach((operation) => {
                operation.tokenSource.dispose(true);
            });
        }));
    }
    _renderHoverParts(hoverParts, hoverPartsContainer, onFinishedRendering) {
        hoverParts.sort(compareBy((hover) => hover.ordinal, numberComparator));
        return hoverParts.map((hoverPart) => {
            const renderedHoverPart = this._renderHoverPart(hoverPart, onFinishedRendering);
            hoverPartsContainer.appendChild(renderedHoverPart.hoverElement);
            return renderedHoverPart;
        });
    }
    _renderHoverPart(hoverPart, onFinishedRendering) {
        const renderedMarkdownPart = this._renderMarkdownHover(hoverPart, onFinishedRendering);
        const renderedMarkdownElement = renderedMarkdownPart.hoverElement;
        const hoverSource = hoverPart.source;
        const disposables = new DisposableStore();
        disposables.add(renderedMarkdownPart);
        if (!hoverSource) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const canIncreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Increase);
        const canDecreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Decrease);
        if (!canIncreaseVerbosity && !canDecreaseVerbosity) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const actionsContainer = $('div.verbosity-actions');
        renderedMarkdownElement.prepend(actionsContainer);
        const actionsContainerInner = $('div.verbosity-actions-inner');
        actionsContainer.append(actionsContainerInner);
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Increase, canIncreaseVerbosity));
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Decrease, canDecreaseVerbosity));
        return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables, actionsContainerInner);
    }
    _renderMarkdownHover(markdownHover, onFinishedRendering) {
        const renderedMarkdownHover = renderMarkdownInContainer(this._editor, markdownHover, this._languageService, this._openerService, onFinishedRendering);
        return renderedMarkdownHover;
    }
    _renderHoverExpansionAction(container, action, actionEnabled) {
        const store = new DisposableStore();
        const isActionIncrease = action === HoverVerbosityAction.Increase;
        const actionElement = dom.append(container, $(ThemeIcon.asCSSSelector(isActionIncrease ? increaseHoverVerbosityIcon : decreaseHoverVerbosityIcon)));
        actionElement.tabIndex = 0;
        const hoverDelegate = new WorkbenchHoverDelegate('mouse', undefined, { target: container, position: { hoverPosition: 0 /* HoverPosition.LEFT */ } }, this._configurationService, this._hoverService);
        store.add(this._hoverService.setupManagedHover(hoverDelegate, actionElement, labelForHoverVerbosityAction(this._keybindingService, action)));
        if (!actionEnabled) {
            actionElement.classList.add('disabled');
            return store;
        }
        actionElement.classList.add('enabled');
        const actionFunction = () => this._commandService.executeCommand(action === HoverVerbosityAction.Increase
            ? INCREASE_HOVER_VERBOSITY_ACTION_ID
            : DECREASE_HOVER_VERBOSITY_ACTION_ID, { focus: true });
        store.add(new ClickAction(actionElement, actionFunction));
        store.add(new KeyDownAction(actionElement, actionFunction, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        return store;
    }
    handleScroll(e) {
        this.renderedHoverParts.forEach((renderedHoverPart) => {
            const actionsContainerInner = renderedHoverPart.actionsContainer;
            if (!actionsContainerInner) {
                return;
            }
            const hoverElement = renderedHoverPart.hoverElement;
            const topOfHoverScrollPosition = e.scrollTop;
            const bottomOfHoverScrollPosition = topOfHoverScrollPosition + e.height;
            const topOfRenderedPart = hoverElement.offsetTop;
            const hoverElementHeight = hoverElement.clientHeight;
            const bottomOfRenderedPart = topOfRenderedPart + hoverElementHeight;
            const iconsHeight = 22;
            let top;
            if (bottomOfRenderedPart <= bottomOfHoverScrollPosition ||
                topOfRenderedPart >= bottomOfHoverScrollPosition) {
                top = hoverElementHeight - iconsHeight;
            }
            else {
                top = bottomOfHoverScrollPosition - topOfRenderedPart - iconsHeight;
            }
            actionsContainerInner.style.top = `${top}px`;
        });
    }
    async updateMarkdownHoverPartVerbosityLevel(action, index) {
        const model = this._editor.getModel();
        if (!model) {
            return undefined;
        }
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return undefined;
        }
        const newHover = await this._fetchHover(hoverSource, model, action);
        if (!newHover) {
            return undefined;
        }
        const newHoverSource = new HoverSource(newHover, hoverSource.hoverProvider, hoverSource.hoverPosition);
        const initialHoverPart = hoverRenderedPart.hoverPart;
        const newHoverPart = new MarkdownHover(this._hoverParticipant, initialHoverPart.range, newHover.contents, initialHoverPart.isBeforeContent, initialHoverPart.ordinal, newHoverSource);
        const newHoverRenderedPart = this._updateRenderedHoverPart(index, newHoverPart);
        if (!newHoverRenderedPart) {
            return undefined;
        }
        return {
            hoverPart: newHoverPart,
            hoverElement: newHoverRenderedPart.hoverElement,
        };
    }
    getAccessibleContent(hoverPart) {
        const renderedHoverPartIndex = this.renderedHoverParts.findIndex((renderedHoverPart) => renderedHoverPart.hoverPart === hoverPart);
        if (renderedHoverPartIndex === -1) {
            return undefined;
        }
        const renderedHoverPart = this._getRenderedHoverPartAtIndex(renderedHoverPartIndex);
        if (!renderedHoverPart) {
            return undefined;
        }
        const hoverElementInnerText = renderedHoverPart.hoverElement.innerText;
        const accessibleContent = hoverElementInnerText.replace(/[^\S\n\r]+/gu, ' ');
        return accessibleContent;
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return false;
        }
        return true;
    }
    async _fetchHover(hoverSource, model, action) {
        let verbosityDelta = action === HoverVerbosityAction.Increase ? 1 : -1;
        const provider = hoverSource.hoverProvider;
        const ongoingHoverOperation = this._ongoingHoverOperations.get(provider);
        if (ongoingHoverOperation) {
            ongoingHoverOperation.tokenSource.cancel();
            verbosityDelta += ongoingHoverOperation.verbosityDelta;
        }
        const tokenSource = new CancellationTokenSource();
        this._ongoingHoverOperations.set(provider, { verbosityDelta, tokenSource });
        const context = {
            verbosityRequest: { verbosityDelta, previousHover: hoverSource.hover },
        };
        let hover;
        try {
            hover = await Promise.resolve(provider.provideHover(model, hoverSource.hoverPosition, tokenSource.token, context));
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        tokenSource.dispose();
        this._ongoingHoverOperations.delete(provider);
        return hover;
    }
    _updateRenderedHoverPart(index, hoverPart) {
        if (index >= this.renderedHoverParts.length || index < 0) {
            return undefined;
        }
        const renderedHoverPart = this._renderHoverPart(hoverPart, this._onFinishedRendering);
        const currentRenderedHoverPart = this.renderedHoverParts[index];
        const currentRenderedMarkdown = currentRenderedHoverPart.hoverElement;
        const renderedMarkdown = renderedHoverPart.hoverElement;
        const renderedChildrenElements = Array.from(renderedMarkdown.children);
        currentRenderedMarkdown.replaceChildren(...renderedChildrenElements);
        const newRenderedHoverPart = new RenderedMarkdownHoverPart(hoverPart, currentRenderedMarkdown, renderedHoverPart.disposables, renderedHoverPart.actionsContainer);
        currentRenderedHoverPart.dispose();
        this.renderedHoverParts[index] = newRenderedHoverPart;
        return newRenderedHoverPart;
    }
    _getRenderedHoverPartAtIndex(index) {
        return this.renderedHoverParts[index];
    }
    dispose() {
        this._disposables.dispose();
    }
}
export function renderMarkdownHovers(context, markdownHovers, editor, languageService, openerService) {
    // Sort hover parts to keep them stable since they might come in async, out-of-order
    markdownHovers.sort(compareBy((hover) => hover.ordinal, numberComparator));
    const renderedHoverParts = [];
    for (const markdownHover of markdownHovers) {
        renderedHoverParts.push(renderMarkdownInContainer(editor, markdownHover, languageService, openerService, context.onContentsChanged));
    }
    return new RenderedHoverParts(renderedHoverParts);
}
function renderMarkdownInContainer(editor, markdownHover, languageService, openerService, onFinishedRendering) {
    const disposables = new DisposableStore();
    const renderedMarkdown = $('div.hover-row');
    const renderedMarkdownContents = $('div.hover-row-contents');
    renderedMarkdown.appendChild(renderedMarkdownContents);
    const markdownStrings = markdownHover.contents;
    for (const markdownString of markdownStrings) {
        if (isEmptyMarkdownString(markdownString)) {
            continue;
        }
        const markdownHoverElement = $('div.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
        const renderer = new MarkdownRenderer({ editor }, languageService, openerService);
        const renderedContents = disposables.add(renderer.render(markdownString, {
            asyncRenderCallback: () => {
                hoverContentsElement.className = 'hover-contents code-hover-contents';
                onFinishedRendering();
            },
        }));
        hoverContentsElement.appendChild(renderedContents.element);
        renderedMarkdownContents.appendChild(markdownHoverElement);
    }
    const renderedHoverPart = {
        hoverPart: markdownHover,
        hoverElement: renderedMarkdown,
        dispose() {
            disposables.dispose();
        },
    };
    return renderedHoverPart;
}
export function labelForHoverVerbosityAction(keybindingService, action) {
    switch (action) {
        case HoverVerbosityAction.Increase: {
            const kb = keybindingService.lookupKeybinding(INCREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb
                ? nls.localize('increaseVerbosityWithKb', 'Increase Hover Verbosity ({0})', kb.getLabel())
                : nls.localize('increaseVerbosity', 'Increase Hover Verbosity');
        }
        case HoverVerbosityAction.Decrease: {
            const kb = keybindingService.lookupKeybinding(DECREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb
                ? nls.localize('decreaseVerbosityWithKb', 'Decrease Hover Verbosity ({0})', kb.getLabel())
                : nls.localize('decreaseVerbosity', 'Decrease Hover Verbosity');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Ib3ZlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL21hcmtkb3duSG92ZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFFTixxQkFBcUIsRUFDckIsY0FBYyxHQUNkLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN2RyxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGtDQUFrQyxHQUNsQyxNQUFNLHFCQUFxQixDQUFBO0FBRzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBU04sa0JBQWtCLEdBQ2xCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixF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