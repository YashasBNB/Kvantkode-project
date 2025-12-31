var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineChatZoneWidget_1;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, Dimension } from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { StableEditorBottomScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isResponseVM } from '../../chat/common/chatViewModel.js';
import { ACTION_REGENERATE_RESPONSE, ACTION_REPORT_ISSUE, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_SIDE, MENU_INLINE_CHAT_WIDGET_SECONDARY, MENU_INLINE_CHAT_WIDGET_STATUS, } from '../common/inlineChat.js';
import { EditorBasedInlineChatWidget } from './inlineChatWidget.js';
let InlineChatZoneWidget = class InlineChatZoneWidget extends ZoneWidget {
    static { InlineChatZoneWidget_1 = this; }
    static { this._options = {
        showFrame: true,
        frameWidth: 1,
        // frameColor: 'var(--vscode-inlineChat-border)',
        isResizeable: true,
        showArrow: false,
        isAccessible: true,
        className: 'inline-chat-widget',
        keepEditorSelection: true,
        showInHiddenAreas: true,
        ordinal: 50000,
    }; }
    constructor(location, options, editor, _instaService, _logService, contextKeyService) {
        super(editor, InlineChatZoneWidget_1._options);
        this._instaService = _instaService;
        this._logService = _logService;
        this._scrollUp = this._disposables.add(new ScrollUpState(this.editor));
        this._ctxCursorPosition = CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.bindTo(contextKeyService);
        this._disposables.add(toDisposable(() => {
            this._ctxCursorPosition.reset();
        }));
        this.widget = this._instaService.createInstance(EditorBasedInlineChatWidget, location, this.editor, {
            statusMenuId: {
                menu: MENU_INLINE_CHAT_WIDGET_STATUS,
                options: {
                    buttonConfigProvider: (action, index) => {
                        const isSecondary = index > 0;
                        if (new Set([ACTION_REGENERATE_RESPONSE, ACTION_TOGGLE_DIFF, ACTION_REPORT_ISSUE]).has(action.id)) {
                            return { isSecondary, showIcon: true, showLabel: false };
                        }
                        else {
                            return { isSecondary };
                        }
                    },
                },
            },
            secondaryMenuId: MENU_INLINE_CHAT_WIDGET_SECONDARY,
            inZoneWidget: true,
            chatWidgetViewOptions: {
                menus: {
                    telemetrySource: 'interactiveEditorWidget-toolbar',
                    inputSideToolbar: MENU_INLINE_CHAT_SIDE,
                },
                ...options,
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        // render when dealing with the current file in the editor
                        return isEqual(uri, editor.getModel()?.uri);
                    },
                    renderDetectedCommandsWithRequest: true,
                    ...options?.rendererOptions,
                },
            },
        });
        this._disposables.add(this.widget);
        let revealFn;
        this._disposables.add(this.widget.chatWidget.onWillMaybeChangeHeight(() => {
            if (this.position) {
                revealFn = this._createZoneAndScrollRestoreFn(this.position);
            }
        }));
        this._disposables.add(this.widget.onDidChangeHeight(() => {
            if (this.position && !this._usesResizeHeight) {
                // only relayout when visible
                revealFn ??= this._createZoneAndScrollRestoreFn(this.position);
                const height = this._computeHeight();
                this._relayout(height.linesValue);
                revealFn?.();
                revealFn = undefined;
            }
        }));
        this.create();
        this._disposables.add(autorun((r) => {
            const isBusy = this.widget.requestInProgress.read(r);
            this.domNode.firstElementChild?.classList.toggle('busy', isBusy);
        }));
        this._disposables.add(addDisposableListener(this.domNode, 'click', (e) => {
            if (!this.editor.hasWidgetFocus() && !this.widget.hasFocus()) {
                this.editor.focus();
            }
        }, true));
        // todo@jrieken listen ONLY when showing
        const updateCursorIsAboveContextKey = () => {
            if (!this.position || !this.editor.hasModel()) {
                this._ctxCursorPosition.reset();
            }
            else if (this.position.lineNumber === this.editor.getPosition().lineNumber) {
                this._ctxCursorPosition.set('above');
            }
            else if (this.position.lineNumber + 1 === this.editor.getPosition().lineNumber) {
                this._ctxCursorPosition.set('below');
            }
            else {
                this._ctxCursorPosition.reset();
            }
        };
        this._disposables.add(this.editor.onDidChangeCursorPosition((e) => updateCursorIsAboveContextKey()));
        this._disposables.add(this.editor.onDidFocusEditorText((e) => updateCursorIsAboveContextKey()));
        updateCursorIsAboveContextKey();
    }
    _fillContainer(container) {
        container.style.setProperty('--vscode-inlineChat-background', 'var(--vscode-editor-background)');
        container.appendChild(this.widget.domNode);
    }
    _doLayout(heightInPixel) {
        this._updatePadding();
        const info = this.editor.getLayoutInfo();
        const width = info.contentWidth - info.verticalScrollbarWidth;
        // width = Math.min(850, width);
        this._dimension = new Dimension(width, heightInPixel);
        this.widget.layout(this._dimension);
    }
    _computeHeight() {
        const chatContentHeight = this.widget.contentHeight;
        const editorHeight = this.editor.getLayoutInfo().height;
        const contentHeight = this._decoratingElementsHeight() +
            Math.min(chatContentHeight, Math.max(this.widget.minHeight, editorHeight * 0.42));
        const heightInLines = contentHeight / this.editor.getOption(68 /* EditorOption.lineHeight */);
        return { linesValue: heightInLines, pixelsValue: contentHeight };
    }
    _getResizeBounds() {
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const decoHeight = this._decoratingElementsHeight();
        const minHeightPx = decoHeight + this.widget.minHeight;
        const maxHeightPx = decoHeight + this.widget.contentHeight;
        return {
            minLines: minHeightPx / lineHeight,
            maxLines: maxHeightPx / lineHeight,
        };
    }
    _onWidth(_widthInPixel) {
        if (this._dimension) {
            this._doLayout(this._dimension.height);
        }
    }
    show(position) {
        assertType(this.container);
        this._updatePadding();
        const revealZone = this._createZoneAndScrollRestoreFn(position);
        super.show(position, this._computeHeight().linesValue);
        this.widget.chatWidget.setVisible(true);
        this.widget.focus();
        revealZone();
        this._scrollUp.enable();
    }
    _updatePadding() {
        assertType(this.container);
        const info = this.editor.getLayoutInfo();
        const marginWithoutIndentation = info.glyphMarginWidth + info.lineNumbersWidth + info.decorationsWidth;
        this.container.style.paddingLeft = `${marginWithoutIndentation}px`;
    }
    reveal(position) {
        const stickyScroll = this.editor.getOption(120 /* EditorOption.stickyScroll */);
        const magicValue = stickyScroll.enabled ? stickyScroll.maxLineCount : 0;
        this.editor.revealLines(position.lineNumber + magicValue, position.lineNumber + magicValue, 1 /* ScrollType.Immediate */);
        this._scrollUp.reset();
        this.updatePositionAndHeight(position);
    }
    updatePositionAndHeight(position) {
        const revealZone = this._createZoneAndScrollRestoreFn(position);
        super.updatePositionAndHeight(position, !this._usesResizeHeight ? this._computeHeight().linesValue : undefined);
        revealZone();
    }
    _createZoneAndScrollRestoreFn(position) {
        const scrollState = StableEditorBottomScrollState.capture(this.editor);
        const lineNumber = position.lineNumber <= 1 ? 1 : 1 + position.lineNumber;
        const scrollTop = this.editor.getScrollTop();
        const lineTop = this.editor.getTopForLineNumber(lineNumber);
        const zoneTop = lineTop - this._computeHeight().pixelsValue;
        const hasResponse = this.widget.chatWidget.viewModel?.getItems().find((candidate) => {
            return isResponseVM(candidate) && candidate.response.value.length > 0;
        });
        if ((hasResponse && zoneTop < scrollTop) || this._scrollUp.didScrollUpOrDown) {
            // don't reveal the zone if it is already out of view (unless we are still getting ready)
            // or if an outside scroll-up happened (e.g the user scrolled up/down to see the new content)
            return this._scrollUp.runIgnored(() => {
                scrollState.restore(this.editor);
            });
        }
        return this._scrollUp.runIgnored(() => {
            scrollState.restore(this.editor);
            const scrollTop = this.editor.getScrollTop();
            const lineTop = this.editor.getTopForLineNumber(lineNumber);
            const zoneTop = lineTop - this._computeHeight().pixelsValue;
            const editorHeight = this.editor.getLayoutInfo().height;
            const lineBottom = this.editor.getBottomForLineNumber(lineNumber);
            let newScrollTop = zoneTop;
            let forceScrollTop = false;
            if (lineBottom >= scrollTop + editorHeight) {
                // revealing the top of the zone would push out the line we are interested in and
                // therefore we keep the line in the viewport
                newScrollTop = lineBottom - editorHeight;
                forceScrollTop = true;
            }
            if (newScrollTop < scrollTop || forceScrollTop) {
                this._logService.trace('[IE] REVEAL zone', {
                    zoneTop,
                    lineTop,
                    lineBottom,
                    scrollTop,
                    newScrollTop,
                    forceScrollTop,
                });
                this.editor.setScrollTop(newScrollTop, 1 /* ScrollType.Immediate */);
            }
        });
    }
    revealRange(range, isLastLine) {
        // noop
    }
    hide() {
        const scrollState = StableEditorBottomScrollState.capture(this.editor);
        this._scrollUp.disable();
        this._ctxCursorPosition.reset();
        this.widget.reset();
        this.widget.chatWidget.setVisible(false);
        super.hide();
        aria.status(localize('inlineChatClosed', 'Closed inline chat widget'));
        scrollState.restore(this.editor);
    }
};
InlineChatZoneWidget = InlineChatZoneWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], InlineChatZoneWidget);
export { InlineChatZoneWidget };
class ScrollUpState {
    constructor(_editor) {
        this._editor = _editor;
        this._ignoreEvents = false;
        this._listener = new MutableDisposable();
    }
    dispose() {
        this._listener.dispose();
    }
    reset() {
        this._didScrollUpOrDown = undefined;
    }
    enable() {
        this._didScrollUpOrDown = undefined;
        this._listener.value = this._editor.onDidScrollChange((e) => {
            if (!e.scrollTopChanged || this._ignoreEvents) {
                return;
            }
            this._listener.clear();
            this._didScrollUpOrDown = true;
        });
    }
    disable() {
        this._listener.clear();
        this._didScrollUpOrDown = undefined;
    }
    runIgnored(callback) {
        return () => {
            this._ignoreEvents = true;
            try {
                return callback();
            }
            finally {
                this._ignoreEvents = false;
            }
        };
    }
    get didScrollUpOrDown() {
        return this._didScrollUpOrDown;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFpvbmVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUtoRyxPQUFPLEVBQVksVUFBVSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixxQ0FBcUMsRUFDckMscUJBQXFCLEVBQ3JCLGlD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