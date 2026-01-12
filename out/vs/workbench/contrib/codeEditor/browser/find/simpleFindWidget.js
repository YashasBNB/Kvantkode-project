/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './simpleFindWidget.css';
import * as nls from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { Widget } from '../../../../../base/browser/ui/widget.js';
import { Delayer } from '../../../../../base/common/async.js';
import { FindReplaceState, } from '../../../../../editor/contrib/find/browser/findState.js';
import { SimpleButton, findPreviousMatchIcon, findNextMatchIcon, NLS_NO_RESULTS, NLS_MATCHES_LOCATION, } from '../../../../../editor/contrib/find/browser/findWidget.js';
import { ContextScopedFindInput } from '../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { widgetClose } from '../../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import * as strings from '../../../../../base/common/strings.js';
import { showHistoryKeybindingHint } from '../../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { defaultInputBoxStyles, defaultToggleStyles, } from '../../../../../platform/theme/browser/defaultStyles.js';
import { Sash, } from '../../../../../base/browser/ui/sash/sash.js';
import { registerColor } from '../../../../../platform/theme/common/colorRegistry.js';
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', 'Find');
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', 'Find');
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', 'Previous Match');
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', 'Next Match');
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', 'Close');
const SIMPLE_FIND_WIDGET_INITIAL_WIDTH = 310;
const MATCHES_COUNT_WIDTH = 73;
export class SimpleFindWidget extends Widget {
    constructor(options, contextViewService, contextKeyService, hoverService, _keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this._isVisible = false;
        this._foundMatch = false;
        this._width = 0;
        this.state = this._register(new FindReplaceState());
        this._matchesLimit = options.matchesLimit ?? Number.MAX_SAFE_INTEGER;
        this._findInput = this._register(new ContextScopedFindInput(null, contextViewService, {
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    new RegExp(value);
                    return null;
                }
                catch (e) {
                    this._foundMatch = false;
                    this.updateButtons(this._foundMatch);
                    return { content: e.message };
                }
            },
            showCommonFindToggles: options.showCommonFindToggles,
            appendCaseSensitiveLabel: options.appendCaseSensitiveActionId
                ? this._getKeybinding(options.appendCaseSensitiveActionId)
                : undefined,
            appendRegexLabel: options.appendRegexActionId
                ? this._getKeybinding(options.appendRegexActionId)
                : undefined,
            appendWholeWordsLabel: options.appendWholeWordsActionId
                ? this._getKeybinding(options.appendWholeWordsActionId)
                : undefined,
            showHistoryHint: () => showHistoryKeybindingHint(_keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
        }, contextKeyService));
        // Find History with update delayer
        this._updateHistoryDelayer = this._register(new Delayer(500));
        this._register(this._findInput.onInput(async (e) => {
            if (!options.checkImeCompletionState || !this._findInput.isImeSessionInProgress) {
                this._foundMatch = this._onInputChanged();
                if (options.showResultCount) {
                    await this.updateResultCount();
                }
                this.updateButtons(this._foundMatch);
                this.focusFindBox();
                this._delayedUpdateHistory();
            }
        }));
        this._findInput.setRegex(!!this.state.isRegex);
        this._findInput.setCaseSensitive(!!this.state.matchCase);
        this._findInput.setWholeWords(!!this.state.wholeWord);
        this._register(this._findInput.onDidOptionChange(() => {
            this.state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive(),
            }, true);
        }));
        this._register(this.state.onFindReplaceStateChange(() => {
            this._findInput.setRegex(this.state.isRegex);
            this._findInput.setWholeWords(this.state.wholeWord);
            this._findInput.setCaseSensitive(this.state.matchCase);
            this.findFirst();
        }));
        this.prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL +
                (options.previousMatchActionId
                    ? this._getKeybinding(options.previousMatchActionId)
                    : ''),
            icon: findPreviousMatchIcon,
            onTrigger: () => {
                this.find(true);
            },
        }, hoverService));
        this.nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL +
                (options.nextMatchActionId ? this._getKeybinding(options.nextMatchActionId) : ''),
            icon: findNextMatchIcon,
            onTrigger: () => {
                this.find(false);
            },
        }, hoverService));
        const closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL +
                (options.closeWidgetActionId ? this._getKeybinding(options.closeWidgetActionId) : ''),
            icon: widgetClose,
            onTrigger: () => {
                this.hide();
            },
        }, hoverService));
        this._innerDomNode = document.createElement('div');
        this._innerDomNode.classList.add('simple-find-part');
        this._innerDomNode.appendChild(this._findInput.domNode);
        this._innerDomNode.appendChild(this.prevBtn.domNode);
        this._innerDomNode.appendChild(this.nextBtn.domNode);
        this._innerDomNode.appendChild(closeBtn.domNode);
        // _domNode wraps _innerDomNode, ensuring that
        this._domNode = document.createElement('div');
        this._domNode.classList.add('simple-find-part-wrapper');
        this._domNode.appendChild(this._innerDomNode);
        this.onkeyup(this._innerDomNode, (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
                e.preventDefault();
                return;
            }
        });
        this._focusTracker = this._register(dom.trackFocus(this._innerDomNode));
        this._register(this._focusTracker.onDidFocus(this._onFocusTrackerFocus.bind(this)));
        this._register(this._focusTracker.onDidBlur(this._onFocusTrackerBlur.bind(this)));
        this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
        this._register(this._findInputFocusTracker.onDidFocus(this._onFindInputFocusTrackerFocus.bind(this)));
        this._register(this._findInputFocusTracker.onDidBlur(this._onFindInputFocusTrackerBlur.bind(this)));
        this._register(dom.addDisposableListener(this._innerDomNode, 'click', (event) => {
            event.stopPropagation();
        }));
        if (options?.showResultCount) {
            this._domNode.classList.add('result-count');
            this._matchesCount = document.createElement('div');
            this._matchesCount.className = 'matchesCount';
            this._findInput.domNode.insertAdjacentElement('afterend', this._matchesCount);
            this._register(this._findInput.onDidChange(async () => {
                await this.updateResultCount();
            }));
            this._register(this._findInput.onDidOptionChange(async () => {
                this._foundMatch = this._onInputChanged();
                await this.updateResultCount();
                this.focusFindBox();
                this._delayedUpdateHistory();
            }));
        }
        let initialMinWidth = options?.initialWidth;
        if (initialMinWidth) {
            initialMinWidth =
                initialMinWidth < SIMPLE_FIND_WIDGET_INITIAL_WIDTH
                    ? SIMPLE_FIND_WIDGET_INITIAL_WIDTH
                    : initialMinWidth;
            this._domNode.style.width = `${initialMinWidth}px`;
        }
        if (options?.enableSash) {
            const _initialMinWidth = initialMinWidth ?? SIMPLE_FIND_WIDGET_INITIAL_WIDTH;
            let originalWidth = _initialMinWidth;
            // sash
            const resizeSash = this._register(new Sash(this._innerDomNode, this, { orientation: 0 /* Orientation.VERTICAL */, size: 1 }));
            this._register(resizeSash.onDidStart(() => {
                originalWidth = parseFloat(dom.getComputedStyle(this._domNode).width);
            }));
            this._register(resizeSash.onDidChange((e) => {
                const width = originalWidth + e.startX - e.currentX;
                if (width < _initialMinWidth) {
                    return;
                }
                this._domNode.style.width = `${width}px`;
            }));
            this._register(resizeSash.onDidReset((e) => {
                const currentWidth = parseFloat(dom.getComputedStyle(this._domNode).width);
                if (currentWidth === _initialMinWidth) {
                    this._domNode.style.width = '100%';
                }
                else {
                    this._domNode.style.width = `${_initialMinWidth}px`;
                }
            }));
        }
    }
    getVerticalSashLeft(_sash) {
        return 0;
    }
    get inputValue() {
        return this._findInput.getValue();
    }
    get focusTracker() {
        return this._focusTracker;
    }
    _getKeybinding(actionId) {
        const kb = this._keybindingService?.lookupKeybinding(actionId);
        if (!kb) {
            return '';
        }
        return ` (${kb.getLabel()})`;
    }
    dispose() {
        super.dispose();
        this._domNode?.remove();
    }
    isVisible() {
        return this._isVisible;
    }
    getDomNode() {
        return this._domNode;
    }
    getFindInputDomNode() {
        return this._findInput.domNode;
    }
    reveal(initialInput, animated = true) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (this._isVisible) {
            this._findInput.select();
            return;
        }
        this._isVisible = true;
        this.updateResultCount();
        this.layout();
        setTimeout(() => {
            this._innerDomNode.classList.toggle('suppress-transition', !animated);
            this._innerDomNode.classList.add('visible', 'visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'false');
            this._findInput.select();
            if (!animated) {
                setTimeout(() => {
                    this._innerDomNode.classList.remove('suppress-transition');
                }, 0);
            }
        }, 0);
    }
    show(initialInput) {
        if (initialInput && !this._isVisible) {
            this._findInput.setValue(initialInput);
        }
        this._isVisible = true;
        this.layout();
        setTimeout(() => {
            this._innerDomNode.classList.add('visible', 'visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'false');
        }, 0);
    }
    hide(animated = true) {
        if (this._isVisible) {
            this._innerDomNode.classList.toggle('suppress-transition', !animated);
            this._innerDomNode.classList.remove('visible-transition');
            this._innerDomNode.setAttribute('aria-hidden', 'true');
            // Need to delay toggling visibility until after Transition, then visibility hidden - removes from tabIndex list
            setTimeout(() => {
                this._isVisible = false;
                this.updateButtons(this._foundMatch);
                this._innerDomNode.classList.remove('visible', 'suppress-transition');
            }, animated ? 200 : 0);
        }
    }
    layout(width = this._width) {
        this._width = width;
        if (!this._isVisible) {
            return;
        }
        if (this._matchesCount) {
            let reducedFindWidget = false;
            if (SIMPLE_FIND_WIDGET_INITIAL_WIDTH + MATCHES_COUNT_WIDTH + 28 >= width) {
                reducedFindWidget = true;
            }
            this._innerDomNode.classList.toggle('reduced-find-widget', reducedFindWidget);
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this));
    }
    _updateHistory() {
        this._findInput.inputBox.addToHistory();
    }
    _getRegexValue() {
        return this._findInput.getRegex();
    }
    _getWholeWordValue() {
        return this._findInput.getWholeWords();
    }
    _getCaseSensitiveValue() {
        return this._findInput.getCaseSensitive();
    }
    updateButtons(foundMatch) {
        const hasInput = this.inputValue.length > 0;
        this.prevBtn.setEnabled(this._isVisible && hasInput && foundMatch);
        this.nextBtn.setEnabled(this._isVisible && hasInput && foundMatch);
    }
    focusFindBox() {
        // Focus back onto the find box, which
        // requires focusing onto the next button first
        this.nextBtn.focus();
        this._findInput.inputBox.focus();
    }
    async updateResultCount() {
        if (!this._matchesCount) {
            this.updateButtons(this._foundMatch);
            return;
        }
        const count = await this._getResultCount();
        this._matchesCount.innerText = '';
        const showRedOutline = this.inputValue.length > 0 && count?.resultCount === 0;
        this._matchesCount.classList.toggle('no-results', showRedOutline);
        let label = '';
        if (count?.resultCount) {
            let matchesCount = String(count.resultCount);
            if (count.resultCount >= this._matchesLimit) {
                matchesCount += '+';
            }
            let matchesPosition = String(count.resultIndex + 1);
            if (matchesPosition === '0') {
                matchesPosition = '?';
            }
            label = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
        }
        else {
            label = NLS_NO_RESULTS;
        }
        status(this._announceSearchResults(label, this.inputValue));
        this._matchesCount.appendChild(document.createTextNode(label));
        this._foundMatch = !!count && count.resultCount > 0;
        this.updateButtons(this._foundMatch);
    }
    changeState(state) {
        this.state.change(state, false);
    }
    _announceSearchResults(label, searchString) {
        if (!searchString) {
            return nls.localize('ariaSearchNoInput', 'Enter search input');
        }
        if (label === NLS_NO_RESULTS) {
            return searchString === ''
                ? nls.localize('ariaSearchNoResultEmpty', '{0} found', label)
                : nls.localize('ariaSearchNoResult', "{0} found for '{1}'", label, searchString);
        }
        return nls.localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", label, searchString);
    }
}
export const simpleFindWidgetSashBorder = registerColor('simpleFindWidget.sashBorder', { dark: '#454545', light: '#C8C8C8', hcDark: '#6FC3DF', hcLight: '#0F4A85' }, nls.localize('simpleFindWidget.sashBorder', 'Border color of the sash border.'));
registerThemingParticipant((theme, collector) => {
    const resizeBorderBackground = theme.getColor(simpleFindWidgetSashBorder);
    collector.addRule(`.monaco-workbench .simple-find-part .monaco-sash { background-color: ${resizeBorderBackground}; border-color: ${resizeBorderBackground} }`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRmluZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2ZpbmQvc2ltcGxlRmluZFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQ04sWUFBWSxFQUNaLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBR2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNqRyxPQUFPLEtBQUssT0FBTyxNQUFNLHVDQUF1QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLG1CQUFtQixHQUNuQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFJTixJQUFJLEdBQ0osTUFBTSw2Q0FB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