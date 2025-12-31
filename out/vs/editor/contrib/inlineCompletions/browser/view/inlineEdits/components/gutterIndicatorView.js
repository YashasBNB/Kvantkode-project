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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUdOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLE9BQU8sRUFDUCxtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMzRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0seURBQXlELENBQUE7QUFDaEUs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