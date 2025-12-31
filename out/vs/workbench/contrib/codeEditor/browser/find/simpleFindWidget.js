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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRmluZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9maW5kL3NpbXBsZUZpbmRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUNOLFlBQVksRUFDWixxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDakcsT0FBTyxLQUFLLE9BQU8sTUFBTSx1Q0FBdUMsQ0FBQTtBQUVoRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEUsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixtQkFBbUIsR0FDbkIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBSU4sSUFBSSxHQUNKLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBR3JGLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFDL0QsTUFBTSwwQkFBMEIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQzNFLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ2hHLE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxZQUFZLENBQUMsQ0FBQTtBQUNwRixNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFrQnRFLE1BQU0sZ0NBQWdDLEdBQUcsR0FBRyxDQUFBO0FBQzVDLE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0FBRTlCLE1BQU0sT0FBZ0IsZ0JBQWlCLFNBQVEsTUFBTTtJQWtCcEQsWUFDQyxPQUFxQixFQUNyQixrQkFBdUMsRUFDdkMsaUJBQXFDLEVBQ3JDLFlBQTJCLEVBQ1Ysa0JBQXNDO1FBRXZELEtBQUssRUFBRSxDQUFBO1FBRlUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQVhoRCxlQUFVLEdBQVksS0FBSyxDQUFBO1FBQzNCLGdCQUFXLEdBQVksS0FBSyxDQUFBO1FBQzVCLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFhekIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUE7UUFFcEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLHNCQUFzQixDQUN6QixJQUFJLEVBQ0osa0JBQWtCLEVBQ2xCO1lBQ0MsS0FBSyxFQUFFLG9CQUFvQjtZQUMzQixXQUFXLEVBQUUsMEJBQTBCO1lBQ3ZDLFVBQVUsRUFBRSxDQUFDLEtBQWEsRUFBMEIsRUFBRTtnQkFDckQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztvQkFDdkQsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxJQUFJLENBQUM7b0JBQ0osSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ2pCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtvQkFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7b0JBQ3BDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQztZQUNELHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxxQkFBcUI7WUFDcEQsd0JBQXdCLEVBQUUsT0FBTyxDQUFDLDJCQUEyQjtnQkFDNUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDO2dCQUMxRCxDQUFDLENBQUMsU0FBUztZQUNaLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxtQkFBbUI7Z0JBQzVDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztnQkFDbEQsQ0FBQyxDQUFDLFNBQVM7WUFDWixxQkFBcUIsRUFBRSxPQUFPLENBQUMsd0JBQXdCO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3ZELENBQUMsQ0FBQyxTQUFTO1lBQ1osZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLGtCQUFrQixDQUFDO1lBQ3BFLGNBQWMsRUFBRSxxQkFBcUI7WUFDckMsWUFBWSxFQUFFLG1CQUFtQjtTQUNqQyxFQUNELGlCQUFpQixDQUNqQixDQUNELENBQUE7UUFDRCxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQU8sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVuRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNqRixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDekMsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQzdCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7Z0JBQy9CLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3BDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtnQkFDbkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXJELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ2hCO2dCQUNDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFO2dCQUMxQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTthQUM3QyxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM1QyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDakIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUIsSUFBSSxZQUFZLENBQ2Y7WUFDQyxLQUFLLEVBQ0osNEJBQTRCO2dCQUM1QixDQUFDLE9BQU8sQ0FBQyxxQkFBcUI7b0JBQzdCLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztvQkFDcEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNQLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsU0FBUyxFQUFFLEdBQUcsRUFBRTtnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2hCLENBQUM7U0FDRCxFQUNELFlBQVksQ0FDWixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLElBQUksWUFBWSxDQUNmO1lBQ0MsS0FBSyxFQUNKLHdCQUF3QjtnQkFDeEIsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsRUFDRCxZQUFZLENBQ1osQ0FDRCxDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUIsSUFBSSxZQUFZLENBQ2Y7WUFDQyxLQUFLLEVBQ0osbUJBQW1CO2dCQUNuQixDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3RGLElBQUksRUFBRSxXQUFXO1lBQ2pCLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ1osQ0FBQztTQUNELEVBQ0QsWUFBWSxDQUNaLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFaEQsOENBQThDO1FBQzlDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxDQUFDLENBQUMsTUFBTSx3QkFBZ0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ1gsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO2dCQUNsQixPQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpGLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ3JGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUNuRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNoRSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsY0FBYyxDQUFBO1lBQzdDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDN0UsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDdEMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUMvQixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUM1QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDekMsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDOUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO2dCQUNuQixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM3QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksZUFBZSxHQUFHLE9BQU8sRUFBRSxZQUFZLENBQUE7UUFDM0MsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixlQUFlO2dCQUNkLGVBQWUsR0FBRyxnQ0FBZ0M7b0JBQ2pELENBQUMsQ0FBQyxnQ0FBZ0M7b0JBQ2xDLENBQUMsQ0FBQyxlQUFlLENBQUE7WUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsZUFBZSxJQUFJLENBQUE7UUFDbkQsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxJQUFJLGdDQUFnQyxDQUFBO1lBQzVFLElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFBO1lBRXBDLE9BQU87WUFDUCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLFdBQVcsOEJBQXNCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQ2xGLENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUMxQixhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEUsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQWEsRUFBRSxFQUFFO2dCQUN4QyxNQUFNLEtBQUssR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFBO2dCQUNuRCxJQUFJLEtBQUssR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO29CQUM5QixPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUE7WUFDekMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMzQixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDMUUsSUFBSSxZQUFZLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQTtnQkFDbkMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLGdCQUFnQixJQUFJLENBQUE7Z0JBQ3BELENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxLQUFXO1FBQ3JDLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQWFELElBQWMsVUFBVTtRQUN2QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxRQUFnQjtRQUN0QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsT0FBTyxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFBO0lBQzdCLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRWYsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFBO0lBQy9CLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBcUIsRUFBRSxRQUFRLEdBQUcsSUFBSTtRQUNuRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3hCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBRWIsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3JFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUNqRSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDdkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUV4QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDZixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDM0QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQztRQUNGLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxJQUFJLENBQUMsWUFBcUI7UUFDaEMsSUFBSSxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUViLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUE7WUFFakUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hELENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFFTSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUk7UUFDMUIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDckUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDekQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RELGdIQUFnSDtZQUNoSCxVQUFVLENBQ1QsR0FBRyxFQUFFO2dCQUNKLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFBO2dCQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDcEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1lBQ3RFLENBQUMsRUFDRCxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNsQixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsUUFBZ0IsSUFBSSxDQUFDLE1BQU07UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFFbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFBO1lBQzdCLElBQUksZ0NBQWdDLEdBQUcsbUJBQW1CLEdBQUcsRUFBRSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxRSxpQkFBaUIsR0FBRyxJQUFJLENBQUE7WUFDekIsQ0FBQztZQUNELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzlFLENBQUM7SUFDRixDQUFDO0lBRVMscUJBQXFCO1FBQzlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRVMsY0FBYztRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtJQUN4QyxDQUFDO0lBRVMsY0FBYztRQUN2QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVTLGtCQUFrQjtRQUMzQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUVTLHNCQUFzQjtRQUMvQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRVMsYUFBYSxDQUFDLFVBQW1CO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLFFBQVEsSUFBSSxVQUFVLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLFFBQVEsSUFBSSxVQUFVLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRVMsWUFBWTtRQUNyQixzQ0FBc0M7UUFDdEMsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUI7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNwQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLFdBQVcsS0FBSyxDQUFDLENBQUE7UUFDN0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNqRSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDZCxJQUFJLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQztZQUN4QixJQUFJLFlBQVksR0FBVyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3BELElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzdDLFlBQVksSUFBSSxHQUFHLENBQUE7WUFDcEIsQ0FBQztZQUNELElBQUksZUFBZSxHQUFXLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzNELElBQUksZUFBZSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUM3QixlQUFlLEdBQUcsR0FBRyxDQUFBO1lBQ3RCLENBQUM7WUFDRCxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDNUUsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLEdBQUcsY0FBYyxDQUFBO1FBQ3ZCLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMzRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBMkI7UUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxLQUFhLEVBQUUsWUFBcUI7UUFDbEUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxJQUFJLEtBQUssS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUM5QixPQUFPLFlBQVksS0FBSyxFQUFFO2dCQUN6QixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDbEYsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FDbEIsNkNBQTZDLEVBQzdDLHFCQUFxQixFQUNyQixLQUFLLEVBQ0wsWUFBWSxDQUNaLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxhQUFhLENBQ3RELDZCQUE2QixFQUM3QixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFDNUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUMvRSxDQUFBO0FBRUQsMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDL0MsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUE7SUFDekUsU0FBUyxDQUFDLE9BQU8sQ0FDaEIsd0VBQXdFLHNCQUFzQixtQkFBbUIsc0JBQXNCLElBQUksQ0FDM0ksQ0FBQTtBQUNGLENBQUMsQ0FBQyxDQUFBIn0=