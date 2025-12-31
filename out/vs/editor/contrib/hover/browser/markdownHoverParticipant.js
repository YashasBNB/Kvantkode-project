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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Ib3ZlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9tYXJrZG93bkhvdmVyUGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLGNBQWMsR0FDZCxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDdkcsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxrQ0FBa0MsR0FDbEMsTUFBTSxxQkFBcUIsQ0FBQTtBQUc1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQVNOLGtCQUFrQixHQUNsQixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FB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