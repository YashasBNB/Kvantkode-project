/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './viewCursors.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { TimeoutTimer } from '../../../../base/common/async.js';
import { ViewPart } from '../../view/viewPart.js';
import { ViewCursor, CursorPlurality } from './viewCursor.js';
import { TextEditorCursorStyle, } from '../../../common/config/editorOptions.js';
import { editorCursorBackground, editorCursorForeground, editorMultiCursorPrimaryForeground, editorMultiCursorPrimaryBackground, editorMultiCursorSecondaryForeground, editorMultiCursorSecondaryBackground, } from '../../../common/core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { WindowIntervalTimer, getWindow } from '../../../../base/browser/dom.js';
/**
 * View cursors is a view part responsible for rendering the primary cursor and
 * any secondary cursors that are currently active.
 */
export class ViewCursors extends ViewPart {
    static { this.BLINK_INTERVAL = 500; }
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        this._readOnly = options.get(96 /* EditorOption.readOnly */);
        this._cursorBlinking = options.get(26 /* EditorOption.cursorBlinking */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._cursorSmoothCaretAnimation = options.get(27 /* EditorOption.cursorSmoothCaretAnimation */);
        this._experimentalEditContextEnabled = options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        this._selectionIsEmpty = true;
        this._isComposingInput = false;
        this._isVisible = false;
        this._primaryCursor = new ViewCursor(this._context, CursorPlurality.Single);
        this._secondaryCursors = [];
        this._renderData = [];
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._updateDomClassName();
        this._domNode.appendChild(this._primaryCursor.getDomNode());
        this._startCursorBlinkAnimation = new TimeoutTimer();
        this._cursorFlatBlinkInterval = new WindowIntervalTimer();
        this._blinkingEnabled = false;
        this._editorHasFocus = false;
        this._updateBlinking();
    }
    dispose() {
        super.dispose();
        this._startCursorBlinkAnimation.dispose();
        this._cursorFlatBlinkInterval.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    // --- begin event handlers
    onCompositionStart(e) {
        this._isComposingInput = true;
        this._updateBlinking();
        return true;
    }
    onCompositionEnd(e) {
        this._isComposingInput = false;
        this._updateBlinking();
        return true;
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._readOnly = options.get(96 /* EditorOption.readOnly */);
        this._cursorBlinking = options.get(26 /* EditorOption.cursorBlinking */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._cursorSmoothCaretAnimation = options.get(27 /* EditorOption.cursorSmoothCaretAnimation */);
        this._experimentalEditContextEnabled = options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        this._updateBlinking();
        this._updateDomClassName();
        this._primaryCursor.onConfigurationChanged(e);
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].onConfigurationChanged(e);
        }
        return true;
    }
    _onCursorPositionChanged(position, secondaryPositions, reason) {
        const pauseAnimation = this._secondaryCursors.length !== secondaryPositions.length ||
            (this._cursorSmoothCaretAnimation === 'explicit' && reason !== 3 /* CursorChangeReason.Explicit */);
        this._primaryCursor.setPlurality(secondaryPositions.length ? CursorPlurality.MultiPrimary : CursorPlurality.Single);
        this._primaryCursor.onCursorPositionChanged(position, pauseAnimation);
        this._updateBlinking();
        if (this._secondaryCursors.length < secondaryPositions.length) {
            // Create new cursors
            const addCnt = secondaryPositions.length - this._secondaryCursors.length;
            for (let i = 0; i < addCnt; i++) {
                const newCursor = new ViewCursor(this._context, CursorPlurality.MultiSecondary);
                this._domNode.domNode.insertBefore(newCursor.getDomNode().domNode, this._primaryCursor.getDomNode().domNode.nextSibling);
                this._secondaryCursors.push(newCursor);
            }
        }
        else if (this._secondaryCursors.length > secondaryPositions.length) {
            // Remove some cursors
            const removeCnt = this._secondaryCursors.length - secondaryPositions.length;
            for (let i = 0; i < removeCnt; i++) {
                this._domNode.removeChild(this._secondaryCursors[0].getDomNode());
                this._secondaryCursors.splice(0, 1);
            }
        }
        for (let i = 0; i < secondaryPositions.length; i++) {
            this._secondaryCursors[i].onCursorPositionChanged(secondaryPositions[i], pauseAnimation);
        }
    }
    onCursorStateChanged(e) {
        const positions = [];
        for (let i = 0, len = e.selections.length; i < len; i++) {
            positions[i] = e.selections[i].getPosition();
        }
        this._onCursorPositionChanged(positions[0], positions.slice(1), e.reason);
        const selectionIsEmpty = e.selections[0].isEmpty();
        if (this._selectionIsEmpty !== selectionIsEmpty) {
            this._selectionIsEmpty = selectionIsEmpty;
            this._updateDomClassName();
        }
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onFocusChanged(e) {
        this._editorHasFocus = e.isFocused;
        this._updateBlinking();
        return false;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onTokensChanged(e) {
        const shouldRender = (position) => {
            for (let i = 0, len = e.ranges.length; i < len; i++) {
                if (e.ranges[i].fromLineNumber <= position.lineNumber &&
                    position.lineNumber <= e.ranges[i].toLineNumber) {
                    return true;
                }
            }
            return false;
        };
        if (shouldRender(this._primaryCursor.getPosition())) {
            return true;
        }
        for (const secondaryCursor of this._secondaryCursors) {
            if (shouldRender(secondaryCursor.getPosition())) {
                return true;
            }
        }
        return false;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    // ---- blinking logic
    _getCursorBlinking() {
        // TODO: Remove the following if statement when experimental edit context is made default sole implementation
        if (this._isComposingInput && !this._experimentalEditContextEnabled) {
            // avoid double cursors
            return 0 /* TextEditorCursorBlinkingStyle.Hidden */;
        }
        if (!this._editorHasFocus) {
            return 0 /* TextEditorCursorBlinkingStyle.Hidden */;
        }
        if (this._readOnly) {
            return 5 /* TextEditorCursorBlinkingStyle.Solid */;
        }
        return this._cursorBlinking;
    }
    _updateBlinking() {
        this._startCursorBlinkAnimation.cancel();
        this._cursorFlatBlinkInterval.cancel();
        const blinkingStyle = this._getCursorBlinking();
        // hidden and solid are special as they involve no animations
        const isHidden = blinkingStyle === 0 /* TextEditorCursorBlinkingStyle.Hidden */;
        const isSolid = blinkingStyle === 5 /* TextEditorCursorBlinkingStyle.Solid */;
        if (isHidden) {
            this._hide();
        }
        else {
            this._show();
        }
        this._blinkingEnabled = false;
        this._updateDomClassName();
        if (!isHidden && !isSolid) {
            if (blinkingStyle === 1 /* TextEditorCursorBlinkingStyle.Blink */) {
                // flat blinking is handled by JavaScript to save battery life due to Chromium step timing issue https://bugs.chromium.org/p/chromium/issues/detail?id=361587
                this._cursorFlatBlinkInterval.cancelAndSet(() => {
                    if (this._isVisible) {
                        this._hide();
                    }
                    else {
                        this._show();
                    }
                }, ViewCursors.BLINK_INTERVAL, getWindow(this._domNode.domNode));
            }
            else {
                this._startCursorBlinkAnimation.setIfNotSet(() => {
                    this._blinkingEnabled = true;
                    this._updateDomClassName();
                }, ViewCursors.BLINK_INTERVAL);
            }
        }
    }
    // --- end blinking logic
    _updateDomClassName() {
        this._domNode.setClassName(this._getClassName());
    }
    _getClassName() {
        let result = 'cursors-layer';
        if (!this._selectionIsEmpty) {
            result += ' has-selection';
        }
        switch (this._cursorStyle) {
            case TextEditorCursorStyle.Line:
                result += ' cursor-line-style';
                break;
            case TextEditorCursorStyle.Block:
                result += ' cursor-block-style';
                break;
            case TextEditorCursorStyle.Underline:
                result += ' cursor-underline-style';
                break;
            case TextEditorCursorStyle.LineThin:
                result += ' cursor-line-thin-style';
                break;
            case TextEditorCursorStyle.BlockOutline:
                result += ' cursor-block-outline-style';
                break;
            case TextEditorCursorStyle.UnderlineThin:
                result += ' cursor-underline-thin-style';
                break;
            default:
                result += ' cursor-line-style';
        }
        if (this._blinkingEnabled) {
            switch (this._getCursorBlinking()) {
                case 1 /* TextEditorCursorBlinkingStyle.Blink */:
                    result += ' cursor-blink';
                    break;
                case 2 /* TextEditorCursorBlinkingStyle.Smooth */:
                    result += ' cursor-smooth';
                    break;
                case 3 /* TextEditorCursorBlinkingStyle.Phase */:
                    result += ' cursor-phase';
                    break;
                case 4 /* TextEditorCursorBlinkingStyle.Expand */:
                    result += ' cursor-expand';
                    break;
                case 5 /* TextEditorCursorBlinkingStyle.Solid */:
                    result += ' cursor-solid';
                    break;
                default:
                    result += ' cursor-solid';
            }
        }
        else {
            result += ' cursor-solid';
        }
        if (this._cursorSmoothCaretAnimation === 'on' ||
            this._cursorSmoothCaretAnimation === 'explicit') {
            result += ' cursor-smooth-caret-animation';
        }
        return result;
    }
    _show() {
        this._primaryCursor.show();
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].show();
        }
        this._isVisible = true;
    }
    _hide() {
        this._primaryCursor.hide();
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].hide();
        }
        this._isVisible = false;
    }
    // ---- IViewPart implementation
    prepareRender(ctx) {
        this._primaryCursor.prepareRender(ctx);
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].prepareRender(ctx);
        }
    }
    render(ctx) {
        const renderData = [];
        let renderDataLen = 0;
        const primaryRenderData = this._primaryCursor.render(ctx);
        if (primaryRenderData) {
            renderData[renderDataLen++] = primaryRenderData;
        }
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            const secondaryRenderData = this._secondaryCursors[i].render(ctx);
            if (secondaryRenderData) {
                renderData[renderDataLen++] = secondaryRenderData;
            }
        }
        this._renderData = renderData;
    }
    getLastRenderData() {
        return this._renderData;
    }
}
registerThemingParticipant((theme, collector) => {
    const cursorThemes = [
        { class: '.cursor', foreground: editorCursorForeground, background: editorCursorBackground },
        {
            class: '.cursor-primary',
            foreground: editorMultiCursorPrimaryForeground,
            background: editorMultiCursorPrimaryBackground,
        },
        {
            class: '.cursor-secondary',
            foreground: editorMultiCursorSecondaryForeground,
            background: editorMultiCursorSecondaryBackground,
        },
    ];
    for (const cursorTheme of cursorThemes) {
        const caret = theme.getColor(cursorTheme.foreground);
        if (caret) {
            let caretBackground = theme.getColor(cursorTheme.background);
            if (!caretBackground) {
                caretBackground = caret.opposite();
            }
            collector.addRule(`.monaco-editor .cursors-layer ${cursorTheme.class} { background-color: ${caret}; border-color: ${caret}; color: ${caretBackground}; }`);
            if (isHighContrast(theme.type)) {
                collector.addRule(`.monaco-editor .cursors-layer.has-selection ${cursorTheme.class} { border-left: 1px solid ${caretBackground}; border-right: 1px solid ${caretBackground}; }`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0N1cnNvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0N1cnNvcnMvdmlld0N1cnNvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRCxPQUFPLEVBQXlCLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNwRixPQUFPLEVBRU4scUJBQXFCLEdBRXJCLE1BQU0seUNBQXlDLENBQUE7QUFFaEQsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixzQkFBc0IsRUFDdEIsa0NBQWtDLEVBQ2xDLGtDQUFrQyxFQUNsQyxvQ0FBb0MsRUFDcEMsb0NBQW9DLEdBQ3BDLE1BQU0sNkNBQTZDLENBQUE7QUFJcEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVoRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFFBQVE7YUFDeEIsbUJBQWMsR0FBRyxHQUFHLENBQUE7SUF3QnBDLFlBQVksT0FBb0I7UUFDL0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRWQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQ25ELElB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