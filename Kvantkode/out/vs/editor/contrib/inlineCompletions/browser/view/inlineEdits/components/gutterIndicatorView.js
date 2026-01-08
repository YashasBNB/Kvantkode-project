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
import { n, trackFocus } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { BugIndicatingError } from '../../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableFromEvent, observableValue, runOnChange, } from '../../../../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../../../../base/common/observableInternal/utils.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../../../platform/storage/common/storage.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorBackground, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorSecondaryBorder, inlineEditIndicatorSecondaryForeground, inlineEditIndicatorsuccessfulBackground, inlineEditIndicatorsuccessfulBorder, inlineEditIndicatorsuccessfulForeground, } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
import { GutterIndicatorMenuContent } from './gutterIndicatorMenu.js';
// Represents the user's familiarity with the inline edits feature.
var UserKind;
(function (UserKind) {
    UserKind["FirstTime"] = "firstTime";
    UserKind["SecondTime"] = "secondTime";
    UserKind["Active"] = "active";
})(UserKind || (UserKind = {}));
let InlineEditsGutterIndicator = class InlineEditsGutterIndicator extends Disposable {
    get model() {
        const model = this._model.get();
        if (!model) {
            throw new BugIndicatingError('Inline Edit Model not available');
        }
        return model;
    }
    get _newUserType() {
        return this._storageService.get('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */, UserKind.FirstTime);
    }
    set _newUserType(value) {
        switch (value) {
            case UserKind.FirstTime:
                throw new BugIndicatingError('UserKind should not be set to first time');
            case UserKind.SecondTime:
                this._firstToSecondTimeUserDisposable.clear();
                break;
            case UserKind.Active:
                this._newUserAnimationDisposable.clear();
                this._firstToSecondTimeUserDisposable.clear();
                this._secondTimeToActiveUserDisposable.clear();
                break;
        }
        this._storageService.store('inlineEditsGutterIndicatorUserKind', value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    constructor(_editorObs, _originalRange, _verticalOffset, _host, _model, _isHoveringOverInlineEdit, _focusIsInMenu, _hoverService, _instantiationService, _storageService, _accessibilityService, themeService) {
        super();
        this._editorObs = _editorObs;
        this._originalRange = _originalRange;
        this._verticalOffset = _verticalOffset;
        this._host = _host;
        this._model = _model;
        this._isHoveringOverInlineEdit = _isHoveringOverInlineEdit;
        this._focusIsInMenu = _focusIsInMenu;
        this._hoverService = _hoverService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._accessibilityService = _accessibilityService;
        this._activeCompletionId = derived((reader) => {
            const layout = this._layout.read(reader);
            if (!layout) {
                return undefined;
            }
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            return model.inlineEdit.inlineCompletion.id;
        });
        this._newUserAnimationDisposable = this._register(new MutableDisposable());
        this._firstToSecondTimeUserDisposable = this._register(new MutableDisposable());
        this._secondTimeToActiveUserDisposable = this._register(new MutableDisposable());
        this._originalRangeObs = mapOutFalsy(this._originalRange);
        this._state = derived((reader) => {
            const range = this._originalRangeObs.read(reader);
            if (!range) {
                return undefined;
            }
            return {
                range,
                lineOffsetRange: this._editorObs.observeLineOffsetRange(range, this._store),
            };
        });
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController
            ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight)
            : constObservable(0);
        this._lineNumberToRender = derived(this, (reader) => {
            if (this._verticalOffset.read(reader) !== 0) {
                return '';
            }
            const lineNumber = this._originalRange.read(reader)?.startLineNumber;
            const lineNumberOptions = this._editorObs.getOption(69 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumber === undefined || lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return '';
            }
            if (lineNumberOptions.renderType === 3 /* RenderLineNumbersType.Interval */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (lineNumber % 10 === 0 || (cursorPosition && cursorPosition.lineNumber === lineNumber)) {
                    return lineNumber.toString();
                }
                return '';
            }
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (!cursorPosition) {
                    return '';
                }
                const relativeLineNumber = Math.abs(lineNumber - cursorPosition.lineNumber);
                if (relativeLineNumber === 0) {
                    return lineNumber.toString();
                }
                return relativeLineNumber.toString();
            }
            if (lineNumberOptions.renderType === 4 /* RenderLineNumbersType.Custom */) {
                if (lineNumberOptions.renderFn) {
                    return lineNumberOptions.renderFn(lineNumber);
                }
                return '';
            }
            return lineNumber.toString();
        });
        this._layout = derived(this, (reader) => {
            const s = this._state.read(reader);
            if (!s) {
                return undefined;
            }
            const layout = this._editorObs.layoutInfo.read(reader);
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const bottomPadding = 1;
            const leftPadding = 1;
            const rightPadding = 1;
            // Entire editor area without sticky scroll
            const fullViewPort = Rect.fromLeftTopRightBottom(0, 0, layout.width, layout.height - bottomPadding);
            const viewPortWithStickyScroll = fullViewPort.withTop(this._stickyScrollHeight.read(reader));
            // The glyph margin area across all relevant lines
            const targetVertRange = s.lineOffsetRange.read(reader);
            const targetRect = Rect.fromRanges(OffsetRange.fromTo(leftPadding + layout.glyphMarginLeft, layout.decorationsLeft + layout.decorationsWidth - rightPadding), targetVertRange);
            // The gutter view container (pill)
            const pillOffset = this._verticalOffset.read(reader);
            let pillRect = targetRect.withHeight(lineHeight).withWidth(22).translateY(pillOffset);
            const pillRectMoved = pillRect.moveToBeContainedIn(viewPortWithStickyScroll);
            const rect = targetRect;
            // Move pill to be in viewport if it is not
            pillRect = targetRect.containsRect(pillRectMoved)
                ? pillRectMoved
                : pillRectMoved.moveToBeContainedIn(fullViewPort.intersect(targetRect.union(fullViewPort.withHeight(lineHeight)))); //viewPortWithStickyScroll.intersect(rect)!;
            // docked = pill was already in the viewport
            const docked = rect.containsRect(pillRect) && viewPortWithStickyScroll.containsRect(pillRect);
            let iconDirecion = targetRect.containsRect(pillRect)
                ? 'right'
                : pillRect.top > targetRect.top
                    ? 'top'
                    : 'bottom';
            // Grow icon the the whole glyph margin area if it is docked
            let lineNumberRect = pillRect.withWidth(0);
            let iconRect = pillRect;
            if (docked && pillRect.top === targetRect.top + pillOffset) {
                pillRect = pillRect.withWidth(layout.decorationsLeft +
                    layout.decorationsWidth -
                    layout.glyphMarginLeft -
                    leftPadding -
                    rightPadding);
                lineNumberRect = pillRect.intersectHorizontal(new OffsetRange(0, Math.max(layout.lineNumbersLeft + layout.lineNumbersWidth - leftPadding - 1, 0)));
                iconRect = iconRect.translateX(lineNumberRect.width);
            }
            let icon;
            if (docked &&
                (this._isHoveredOverIconDebounced.read(reader) ||
                    this._isHoveredOverInlineEditDebounced.read(reader))) {
                icon = renderIcon(Codicon.check);
                iconDirecion = 'right';
            }
            else {
                icon =
                    this._tabAction.read(reader) === InlineEditTabAction.Accept
                        ? renderIcon(Codicon.keyboardTab)
                        : renderIcon(Codicon.arrowRight);
            }
            let rotation = 0;
            switch (iconDirecion) {
                case 'right':
                    rotation = 0;
                    break;
                case 'bottom':
                    rotation = 90;
                    break;
                case 'top':
                    rotation = -90;
                    break;
            }
            return {
                rect,
                icon,
                rotation,
                docked,
                iconRect,
                pillRect,
                lineHeight,
                lineNumberRect,
            };
        });
        this._iconRef = n.ref();
        this._hoverVisible = observableValue(this, false);
        this.isHoverVisible = this._hoverVisible;
        this._isHoveredOverIcon = observableValue(this, false);
        this._isHoveredOverIconDebounced = debouncedObservable(this._isHoveredOverIcon, 100);
        this._tabAction = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return InlineEditTabAction.Inactive;
            }
            return model.tabAction.read(reader);
        });
        this._indicator = n
            .div({
            class: 'inline-edits-view-gutter-indicator',
            onclick: () => {
                const docked = this._layout.map((l) => l && l.docked).get();
                this._editorObs.editor.focus();
                if (docked) {
                    this.model.accept();
                }
                else {
                    this.model.jump();
                }
            },
            tabIndex: 0,
            style: {
                position: 'absolute',
                overflow: 'visible',
            },
        }, mapOutFalsy(this._layout).map((layout) => !layout
            ? []
            : [
                n.div({
                    style: {
                        position: 'absolute',
                        background: asCssVariable(inlineEditIndicatorBackground),
                        borderRadius: '4px',
                        ...rectToProps((reader) => layout.read(reader).rect),
                    },
                }),
                n.div({
                    class: 'icon',
                    ref: this._iconRef,
                    onmouseenter: () => {
                        // TODO show hover when hovering ghost text etc.
                        this._showHover();
                    },
                    style: {
                        cursor: 'pointer',
                        zIndex: '1000',
                        position: 'absolute',
                        backgroundColor: this._gutterIndicatorStyles.map((v) => v.background),
                        ['--vscodeIconForeground']: this._gutterIndicatorStyles.map((v) => v.foreground),
                        border: this._gutterIndicatorStyles.map((v) => `1px solid ${v.border}`),
                        boxSizing: 'border-box',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s ease-in-out, width 0.2s ease-in-out',
                        ...rectToProps((reader) => layout.read(reader).pillRect),
                    },
                }, [
                    n.div({
                        className: 'line-number',
                        style: {
                            lineHeight: layout.map((l) => `${l.lineHeight}px`),
                            display: layout.map((l) => (l.lineNumberRect.width > 0 ? 'flex' : 'none')),
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            width: layout.map((l) => l.lineNumberRect.width),
                            height: '100%',
                            color: this._gutterIndicatorStyles.map((v) => v.foreground),
                        },
                    }, this._lineNumberToRender),
                    n.div({
                        style: {
                            rotate: layout.map((i) => `${i.rotation}deg`),
                            transition: 'rotate 0.2s ease-in-out',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            width: layout.map((l) => `${l.iconRect.width}px`),
                        },
                    }, [layout.map((i) => i.icon)]),
                ]),
            ]))
            .keepUpdated(this._store);
        this._gutterIndicatorStyles = this._tabAction.map((v, reader) => {
            switch (v) {
                case InlineEditTabAction.Inactive:
                    return {
                        background: getEditorBlendedColor(inlineEditIndicatorSecondaryBackground, themeService)
                            .read(reader)
                            .toString(),
                        foreground: getEditorBlendedColor(inlineEditIndicatorSecondaryForeground, themeService)
                            .read(reader)
                            .toString(),
                        border: getEditorBlendedColor(inlineEditIndicatorSecondaryBorder, themeService)
                            .read(reader)
                            .toString(),
                    };
                case InlineEditTabAction.Jump:
                    return {
                        background: getEditorBlendedColor(inlineEditIndicatorPrimaryBackground, themeService)
                            .read(reader)
                            .toString(),
                        foreground: getEditorBlendedColor(inlineEditIndicatorPrimaryForeground, themeService)
                            .read(reader)
                            .toString(),
                        border: getEditorBlendedColor(inlineEditIndicatorPrimaryBorder, themeService)
                            .read(reader)
                            .toString(),
                    };
                case InlineEditTabAction.Accept:
                    return {
                        background: getEditorBlendedColor(inlineEditIndicatorsuccessfulBackground, themeService)
                            .read(reader)
                            .toString(),
                        foreground: getEditorBlendedColor(inlineEditIndicatorsuccessfulForeground, themeService)
                            .read(reader)
                            .toString(),
                        border: getEditorBlendedColor(inlineEditIndicatorsuccessfulBorder, themeService)
                            .read(reader)
                            .toString(),
                    };
            }
        });
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._indicator.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(this._editorObs.editor.onMouseMove((e) => {
            const el = this._iconRef.element;
            const rect = el.getBoundingClientRect();
            const rectangularArea = Rect.fromLeftTopWidthHeight(rect.left, rect.top, rect.width, rect.height);
            const point = new Point(e.event.posx, e.event.posy);
            this._isHoveredOverIcon.set(rectangularArea.containsPoint(point), undefined);
        }));
        this._register(this._editorObs.editor.onDidScrollChange(() => {
            this._isHoveredOverIcon.set(false, undefined);
        }));
        this._isHoveredOverInlineEditDebounced = debouncedObservable(this._isHoveringOverInlineEdit, 100);
        // pulse animation when hovering inline edit
        this._register(runOnChange(this._isHoveredOverInlineEditDebounced, (isHovering) => {
            if (isHovering) {
                this._triggerAnimation();
            }
        }));
        if (this._newUserType === UserKind.Active) {
            this._register(this.setupNewUserExperience());
        }
        this._register(autorun((reader) => {
            this._indicator.readEffect(reader);
            if (this._indicator.element) {
                this._editorObs.editor.applyFontInfo(this._indicator.element);
            }
        }));
        this._register(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                this._storageService.store('inlineEditsGutterIndicatorUserKind', UserKind.Active, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            }));
        }));
    }
    setupNewUserExperience() {
        if (this._newUserType === UserKind.Active) {
            return Disposable.None;
        }
        const disposableStore = new DisposableStore();
        let userHasHoveredOverIcon = false;
        let inlineEditHasBeenAccepted = false;
        let firstTimeUserAnimationCount = 0;
        let secondTimeUserAnimationCount = 0;
        // pulse animation for new users
        disposableStore.add(runOnChange(this._activeCompletionId, async (id) => {
            if (id === undefined) {
                return;
            }
            const userType = this._newUserType;
            // Animation
            switch (userType) {
                case UserKind.FirstTime: {
                    for (let i = 0; i < 3 && this._activeCompletionId.get() === id; i++) {
                        await this._triggerAnimation();
                        await timeout(500);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    this._triggerAnimation();
                    break;
                }
            }
            // User Kind Transition
            switch (userType) {
                case UserKind.FirstTime: {
                    if (++firstTimeUserAnimationCount >= 5 || userHasHoveredOverIcon) {
                        this._newUserType = UserKind.SecondTime;
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    if (++secondTimeUserAnimationCount >= 5 && inlineEditHasBeenAccepted) {
                        this._newUserType = UserKind.Active;
                    }
                    break;
                }
            }
        }));
        // Remember when the user has hovered over the icon
        disposableStore.add(runOnChange(this._isHoveredOverIconDebounced, async (isHovered) => {
            if (isHovered) {
                userHasHoveredOverIcon = true;
            }
        }));
        // Remember when the user has accepted an inline edit
        disposableStore.add(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                inlineEditHasBeenAccepted = true;
            }));
        }));
        return disposableStore;
    }
    _triggerAnimation() {
        if (this._accessibilityService.isMotionReduced()) {
            return new Animation(null, null).finished;
        }
        // WIGGLE ANIMATION:
        /* this._iconRef.element.animate([
            { transform: 'rotate(0) scale(1)', offset: 0 },
            { transform: 'rotate(14.4deg) scale(1.1)', offset: 0.15 },
            { transform: 'rotate(-14.4deg) scale(1.2)', offset: 0.3 },
            { transform: 'rotate(14.4deg) scale(1.1)', offset: 0.45 },
            { transform: 'rotate(-14.4deg) scale(1.2)', offset: 0.6 },
            { transform: 'rotate(0) scale(1)', offset: 1 }
        ], { duration: 800 }); */
        // PULSE ANIMATION:
        const animation = this._iconRef.element.animate([
            {
                outline: `2px solid ${this._gutterIndicatorStyles.map((v) => v.border).get()}`,
                outlineOffset: '-1px',
                offset: 0,
            },
            {
                outline: `2px solid transparent`,
                outlineOffset: '10px',
                offset: 1,
            },
        ], { duration: 500 });
        return animation.finished;
    }
    _showHover() {
        if (this._hoverVisible.get()) {
            return;
        }
        const disposableStore = new DisposableStore();
        const content = disposableStore.add(this._instantiationService
            .createInstance(GutterIndicatorMenuContent, this.model, (focusEditor) => {
            if (focusEditor) {
                this._editorObs.editor.focus();
            }
            h?.dispose();
        }, this._editorObs)
            .toDisposableLiveElement());
        const focusTracker = disposableStore.add(trackFocus(content.element));
        disposableStore.add(focusTracker.onDidBlur(() => this._focusIsInMenu.set(false, undefined)));
        disposableStore.add(focusTracker.onDidFocus(() => this._focusIsInMenu.set(true, undefined)));
        disposableStore.add(toDisposable(() => this._focusIsInMenu.set(false, undefined)));
        const h = this._hoverService.showInstantHover({
            target: this._iconRef.element,
            content: content.element,
        });
        if (h) {
            this._hoverVisible.set(true, undefined);
            disposableStore.add(this._editorObs.editor.onDidScrollChange(() => h.dispose()));
            disposableStore.add(h.onDispose(() => {
                this._hoverVisible.set(false, undefined);
                disposableStore.dispose();
            }));
        }
        else {
            disposableStore.dispose();
        }
    }
};
InlineEditsGutterIndicator = __decorate([
    __param(7, IHoverService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, IAccessibilityService),
    __param(11, IThemeService)
], InlineEditsGutterIndicator);
export { InlineEditsGutterIndicator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2NvbXBvbmVudHMvZ3V0dGVySW5kaWNhdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQy9FLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBR04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsT0FBTyxFQUNQLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDM0csT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzNHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSx5REFBeUQsQ0FBQTtB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