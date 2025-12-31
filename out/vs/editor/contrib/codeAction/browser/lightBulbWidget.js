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
var LightBulbWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Gesture } from '../../../../base/browser/touch.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './lightBulbWidget.css';
import { GlyphMarginLane, } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { computeIndentLevel } from '../../../common/model/utils.js';
import { autoFixCommandId, quickFixCommandId } from './codeAction.js';
import * as nls from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Range } from '../../../common/core/range.js';
const GUTTER_LIGHTBULB_ICON = registerIcon('gutter-lightbulb', Codicon.lightBulb, nls.localize('gutterLightbulbWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor.'));
const GUTTER_LIGHTBULB_AUTO_FIX_ICON = registerIcon('gutter-lightbulb-auto-fix', Codicon.lightbulbAutofix, nls.localize('gutterLightbulbAutoFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and a quick fix is available.'));
const GUTTER_LIGHTBULB_AIFIX_ICON = registerIcon('gutter-lightbulb-sparkle', Codicon.lightbulbSparkle, nls.localize('gutterLightbulbAIFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix is available.'));
const GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON = registerIcon('gutter-lightbulb-aifix-auto-fix', Codicon.lightbulbSparkleAutofix, nls.localize('gutterLightbulbAIFixAutoFixWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix and a quick fix is available.'));
const GUTTER_SPARKLE_FILLED_ICON = registerIcon('gutter-lightbulb-sparkle-filled', Codicon.sparkleFilled, nls.localize('gutterLightbulbSparkleFilledWidget', 'Icon which spawns code actions menu from the gutter when there is no space in the editor and an AI fix and a quick fix is available.'));
var LightBulbState;
(function (LightBulbState) {
    let Type;
    (function (Type) {
        Type[Type["Hidden"] = 0] = "Hidden";
        Type[Type["Showing"] = 1] = "Showing";
    })(Type = LightBulbState.Type || (LightBulbState.Type = {}));
    LightBulbState.Hidden = { type: 0 /* Type.Hidden */ };
    class Showing {
        constructor(actions, trigger, editorPosition, widgetPosition) {
            this.actions = actions;
            this.trigger = trigger;
            this.editorPosition = editorPosition;
            this.widgetPosition = widgetPosition;
            this.type = 1 /* Type.Showing */;
        }
    }
    LightBulbState.Showing = Showing;
})(LightBulbState || (LightBulbState = {}));
let LightBulbWidget = class LightBulbWidget extends Disposable {
    static { LightBulbWidget_1 = this; }
    static { this.GUTTER_DECORATION = ModelDecorationOptions.register({
        description: 'codicon-gutter-lightbulb-decoration',
        glyphMarginClassName: ThemeIcon.asClassName(Codicon.lightBulb),
        glyphMargin: { position: GlyphMarginLane.Left },
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
    }); }
    static { this.ID = 'editor.contrib.lightbulbWidget'; }
    static { this._posPref = [0 /* ContentWidgetPositionPreference.EXACT */]; }
    constructor(_editor, _keybindingService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._state = LightBulbState.Hidden;
        this._gutterState = LightBulbState.Hidden;
        this._iconClasses = [];
        this.lightbulbClasses = [
            'codicon-' + GUTTER_LIGHTBULB_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AUTO_FIX_ICON.id,
            'codicon-' + GUTTER_LIGHTBULB_AIFIX_ICON.id,
            'codicon-' + GUTTER_SPARKLE_FILLED_ICON.id,
        ];
        this.gutterDecoration = LightBulbWidget_1.GUTTER_DECORATION;
        this._domNode = dom.$('div.lightBulbWidget');
        this._domNode.role = 'listbox';
        this._register(Gesture.ignoreTarget(this._domNode));
        this._editor.addContentWidget(this);
        this._register(this._editor.onDidChangeModelContent((_) => {
            // cancel when the line in question has been removed
            const editorModel = this._editor.getModel();
            if (this.state.type !== 1 /* LightBulbState.Type.Showing */ ||
                !editorModel ||
                this.state.editorPosition.lineNumber >= editorModel.getLineCount()) {
                this.hide();
            }
            if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */ ||
                !editorModel ||
                this.gutterState.editorPosition.lineNumber >= editorModel.getLineCount()) {
                this.gutterHide();
            }
        }));
        this._register(dom.addStandardDisposableGenericMouseDownListener(this._domNode, (e) => {
            if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
                return;
            }
            // Make sure that focus / cursor location is not lost when clicking widget icon
            this._editor.focus();
            e.preventDefault();
            // a bit of extra work to make sure the menu
            // doesn't cover the line-text
            const { top, height } = dom.getDomNodePagePosition(this._domNode);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            let pad = Math.floor(lineHeight / 3);
            if (this.state.widgetPosition.position !== null &&
                this.state.widgetPosition.position.lineNumber < this.state.editorPosition.lineNumber) {
                pad += lineHeight;
            }
            this._onClick.fire({
                x: e.posx,
                y: top + height + pad,
                actions: this.state.actions,
                trigger: this.state.trigger,
            });
        }));
        this._register(dom.addDisposableListener(this._domNode, 'mouseenter', (e) => {
            if ((e.buttons & 1) !== 1) {
                return;
            }
            // mouse enters lightbulb while the primary/left button
            // is being pressed -> hide the lightbulb
            this.hide();
        }));
        this._register(Event.runAndSubscribe(this._keybindingService.onDidUpdateKeybindings, () => {
            this._preferredKbLabel =
                this._keybindingService.lookupKeybinding(autoFixCommandId)?.getLabel() ?? undefined;
            this._quickFixKbLabel =
                this._keybindingService.lookupKeybinding(quickFixCommandId)?.getLabel() ?? undefined;
            this._updateLightBulbTitleAndIcon();
        }));
        this._register(this._editor.onMouseDown(async (e) => {
            if (!e.target.element ||
                !this.lightbulbClasses.some((cls) => e.target.element && e.target.element.classList.contains(cls))) {
                return;
            }
            if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */) {
                return;
            }
            // Make sure that focus / cursor location is not lost when clicking widget icon
            this._editor.focus();
            // a bit of extra work to make sure the menu
            // doesn't cover the line-text
            const { top, height } = dom.getDomNodePagePosition(e.target.element);
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            let pad = Math.floor(lineHeight / 3);
            if (this.gutterState.widgetPosition.position !== null &&
                this.gutterState.widgetPosition.position.lineNumber <
                    this.gutterState.editorPosition.lineNumber) {
                pad += lineHeight;
            }
            this._onClick.fire({
                x: e.event.posx,
                y: top + height + pad,
                actions: this.gutterState.actions,
                trigger: this.gutterState.trigger,
            });
        }));
    }
    dispose() {
        super.dispose();
        this._editor.removeContentWidget(this);
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
        }
    }
    getId() {
        return 'LightBulbWidget';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._state.type === 1 /* LightBulbState.Type.Showing */ ? this._state.widgetPosition : null;
    }
    update(actions, trigger, atPosition) {
        if (actions.validActions.length <= 0) {
            this.gutterHide();
            return this.hide();
        }
        const hasTextFocus = this._editor.hasTextFocus();
        if (!hasTextFocus) {
            this.gutterHide();
            return this.hide();
        }
        const options = this._editor.getOptions();
        if (!options.get(66 /* EditorOption.lightbulb */).enabled) {
            this.gutterHide();
            return this.hide();
        }
        const model = this._editor.getModel();
        if (!model) {
            this.gutterHide();
            return this.hide();
        }
        const { lineNumber, column } = model.validatePosition(atPosition);
        const tabSize = model.getOptions().tabSize;
        const fontInfo = this._editor.getOptions().get(52 /* EditorOption.fontInfo */);
        const lineContent = model.getLineContent(lineNumber);
        const indent = computeIndentLevel(lineContent, tabSize);
        const lineHasSpace = fontInfo.spaceWidth * indent > 22;
        const isFolded = (lineNumber) => {
            return (lineNumber > 2 &&
                this._editor.getTopForLineNumber(lineNumber) ===
                    this._editor.getTopForLineNumber(lineNumber - 1));
        };
        // Check for glyph margin decorations of any kind
        const currLineDecorations = this._editor.getLineDecorations(lineNumber);
        let hasDecoration = false;
        if (currLineDecorations) {
            for (const decoration of currLineDecorations) {
                const glyphClass = decoration.options.glyphMarginClassName;
                if (glyphClass &&
                    !this.lightbulbClasses.some((className) => glyphClass.includes(className))) {
                    hasDecoration = true;
                    break;
                }
            }
        }
        let effectiveLineNumber = lineNumber;
        let effectiveColumnNumber = 1;
        if (!lineHasSpace) {
            // Checks if line is empty or starts with any amount of whitespace
            const isLineEmptyOrIndented = (lineNumber) => {
                const lineContent = model.getLineContent(lineNumber);
                return /^\s*$|^\s+/.test(lineContent) || lineContent.length <= effectiveColumnNumber;
            };
            if (lineNumber > 1 && !isFolded(lineNumber - 1)) {
                const lineCount = model.getLineCount();
                const endLine = lineNumber === lineCount;
                const prevLineEmptyOrIndented = lineNumber > 1 && isLineEmptyOrIndented(lineNumber - 1);
                const nextLineEmptyOrIndented = !endLine && isLineEmptyOrIndented(lineNumber + 1);
                const currLineEmptyOrIndented = isLineEmptyOrIndented(lineNumber);
                const notEmpty = !nextLineEmptyOrIndented && !prevLineEmptyOrIndented;
                // check above and below. if both are blocked, display lightbulb in the gutter.
                if (!nextLineEmptyOrIndented && !prevLineEmptyOrIndented && !hasDecoration) {
                    this.gutterState = new LightBulbState.Showing(actions, trigger, atPosition, {
                        position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
                        preference: LightBulbWidget_1._posPref,
                    });
                    this.renderGutterLightbub();
                    return this.hide();
                }
                else if (prevLineEmptyOrIndented ||
                    endLine ||
                    (prevLineEmptyOrIndented && !currLineEmptyOrIndented)) {
                    effectiveLineNumber -= 1;
                }
                else if (nextLineEmptyOrIndented || (notEmpty && currLineEmptyOrIndented)) {
                    effectiveLineNumber += 1;
                }
            }
            else if (lineNumber === 1 &&
                (lineNumber === model.getLineCount() ||
                    (!isLineEmptyOrIndented(lineNumber + 1) && !isLineEmptyOrIndented(lineNumber)))) {
                // special checks for first line blocked vs. not blocked.
                this.gutterState = new LightBulbState.Showing(actions, trigger, atPosition, {
                    position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
                    preference: LightBulbWidget_1._posPref,
                });
                if (hasDecoration) {
                    this.gutterHide();
                }
                else {
                    this.renderGutterLightbub();
                    return this.hide();
                }
            }
            else if (lineNumber < model.getLineCount() && !isFolded(lineNumber + 1)) {
                effectiveLineNumber += 1;
            }
            else if (column * fontInfo.spaceWidth < 22) {
                // cannot show lightbulb above/below and showing
                // it inline would overlay the cursor...
                return this.hide();
            }
            effectiveColumnNumber = /^\S\s*$/.test(model.getLineContent(effectiveLineNumber)) ? 2 : 1;
        }
        this.state = new LightBulbState.Showing(actions, trigger, atPosition, {
            position: { lineNumber: effectiveLineNumber, column: effectiveColumnNumber },
            preference: LightBulbWidget_1._posPref,
        });
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
            this.gutterHide();
        }
        const validActions = actions.validActions;
        const actionKind = actions.validActions[0].action.kind;
        if (validActions.length !== 1 || !actionKind) {
            this._editor.layoutContentWidget(this);
            return;
        }
        this._editor.layoutContentWidget(this);
    }
    hide() {
        if (this.state === LightBulbState.Hidden) {
            return;
        }
        this.state = LightBulbState.Hidden;
        this._editor.layoutContentWidget(this);
    }
    gutterHide() {
        if (this.gutterState === LightBulbState.Hidden) {
            return;
        }
        if (this._gutterDecorationID) {
            this._removeGutterDecoration(this._gutterDecorationID);
        }
        this.gutterState = LightBulbState.Hidden;
    }
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;
        this._updateLightBulbTitleAndIcon();
    }
    get gutterState() {
        return this._gutterState;
    }
    set gutterState(value) {
        this._gutterState = value;
        this._updateGutterLightBulbTitleAndIcon();
    }
    _updateLightBulbTitleAndIcon() {
        this._domNode.classList.remove(...this._iconClasses);
        this._iconClasses = [];
        if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        let icon;
        let autoRun = false;
        if (this.state.actions.allAIFixes) {
            icon = Codicon.sparkleFilled;
            if (this.state.actions.validActions.length === 1) {
                autoRun = true;
            }
        }
        else if (this.state.actions.hasAutoFix) {
            if (this.state.actions.hasAIFix) {
                icon = Codicon.lightbulbSparkleAutofix;
            }
            else {
                icon = Codicon.lightbulbAutofix;
            }
        }
        else if (this.state.actions.hasAIFix) {
            icon = Codicon.lightbulbSparkle;
        }
        else {
            icon = Codicon.lightBulb;
        }
        this._updateLightbulbTitle(this.state.actions.hasAutoFix, autoRun);
        this._iconClasses = ThemeIcon.asClassNameArray(icon);
        this._domNode.classList.add(...this._iconClasses);
    }
    _updateGutterLightBulbTitleAndIcon() {
        if (this.gutterState.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        let icon;
        let autoRun = false;
        if (this.gutterState.actions.allAIFixes) {
            icon = GUTTER_SPARKLE_FILLED_ICON;
            if (this.gutterState.actions.validActions.length === 1) {
                autoRun = true;
            }
        }
        else if (this.gutterState.actions.hasAutoFix) {
            if (this.gutterState.actions.hasAIFix) {
                icon = GUTTER_LIGHTBULB_AIFIX_AUTO_FIX_ICON;
            }
            else {
                icon = GUTTER_LIGHTBULB_AUTO_FIX_ICON;
            }
        }
        else if (this.gutterState.actions.hasAIFix) {
            icon = GUTTER_LIGHTBULB_AIFIX_ICON;
        }
        else {
            icon = GUTTER_LIGHTBULB_ICON;
        }
        this._updateLightbulbTitle(this.gutterState.actions.hasAutoFix, autoRun);
        const GUTTER_DECORATION = ModelDecorationOptions.register({
            description: 'codicon-gutter-lightbulb-decoration',
            glyphMarginClassName: ThemeIcon.asClassName(icon),
            glyphMargin: { position: GlyphMarginLane.Left },
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        this.gutterDecoration = GUTTER_DECORATION;
    }
    /* Gutter Helper Functions */
    renderGutterLightbub() {
        const selection = this._editor.getSelection();
        if (!selection) {
            return;
        }
        if (this._gutterDecorationID === undefined) {
            this._addGutterDecoration(selection.startLineNumber);
        }
        else {
            this._updateGutterDecoration(this._gutterDecorationID, selection.startLineNumber);
        }
    }
    _addGutterDecoration(lineNumber) {
        this._editor.changeDecorations((accessor) => {
            this._gutterDecorationID = accessor.addDecoration(new Range(lineNumber, 0, lineNumber, 0), this.gutterDecoration);
        });
    }
    _removeGutterDecoration(decorationId) {
        this._editor.changeDecorations((accessor) => {
            accessor.removeDecoration(decorationId);
            this._gutterDecorationID = undefined;
        });
    }
    _updateGutterDecoration(decorationId, lineNumber) {
        this._editor.changeDecorations((accessor) => {
            accessor.changeDecoration(decorationId, new Range(lineNumber, 0, lineNumber, 0));
            accessor.changeDecorationOptions(decorationId, this.gutterDecoration);
        });
    }
    _updateLightbulbTitle(autoFix, autoRun) {
        if (this.state.type !== 1 /* LightBulbState.Type.Showing */) {
            return;
        }
        if (autoRun) {
            this.title = nls.localize('codeActionAutoRun', 'Run: {0}', this.state.actions.validActions[0].action.title);
        }
        else if (autoFix && this._preferredKbLabel) {
            this.title = nls.localize('preferredcodeActionWithKb', 'Show Code Actions. Preferred Quick Fix Available ({0})', this._preferredKbLabel);
        }
        else if (!autoFix && this._quickFixKbLabel) {
            this.title = nls.localize('codeActionWithKb', 'Show Code Actions ({0})', this._quickFixKbLabel);
        }
        else if (!autoFix) {
            this.title = nls.localize('codeAction', 'Show Code Actions');
        }
    }
    set title(value) {
        this._domNode.title = value;
    }
};
LightBulbWidget = LightBulbWidget_1 = __decorate([
    __param(1, IKeybindingService)
], LightBulbWidget);
export { LightBulbWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlnaHRCdWxiV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2xpZ2h0QnVsYldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLHVCQUF1QixDQUFBO0FBVTlCLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVyRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQ3pDLGtCQUFrQixFQUNsQixPQUFPLENBQUMsU0FBUyxFQUNqQixHQUFHLENBQUMsUUFBUSxDQUNYLHVCQUF1QixFQUN2QiwyRkFBMkYsQ0FDM0YsQ0FDRCxDQUFBO0FBQ0QsTUFBTSw4QkFBOEIsR0FBRyxZQUFZLENBQ2xELDJCQUEyQixFQUMzQixPQUFPLENBQUMsZ0JBQWdCLEVBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsOEJBQThCLEVBQzlCLHdIQUF3SCxDQUN4SCxDQUNELENBQUE7QUFDRCxNQUFNLDJCQUEyQixHQUFHLFlBQVksQ0FDL0MsMEJBQTBCLEVBQzFCLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDeEIsR0FBRyxDQUFDLFFBQVEsQ0FDWCw0QkFBNEIsRUFDNUIsc0hBQXNILENBQ3RILENBQ0QsQ0FBQTtBQUNELE1BQU0sb0NBQW9DLEdBQUcsWUFBWSxDQUN4RCxpQ0FBaUMsRUFDakMsT0FBTyxDQUFDLHVCQUF1QixFQUMvQixHQUFHLENBQUMsUUFBUSxDQUNYLG1DQUFtQyxFQUNuQyxzSUFBc0ksQ0FDdEksQ0FDRCxDQUFBO0FBQ0QsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQzlDLGlDQUFpQyxFQUNqQyxPQUFPLENBQUMsYUFBYSxFQUNyQixHQUFHLENBQUMsUUFBUSxDQUNYLG9DQUFvQyxFQUNwQyxzSUFBc0ksQ0FDdEksQ0FDRCxDQUFBO0FBRUQsSUFBVSxjQUFjLENBb0J2QjtBQXBCRCxXQUFVLGNBQWM7SUFDdkIsSUFBa0IsSUFHakI7SUFIRCxXQUFrQixJQUFJO1FBQ3JCLG1DQUFNLENBQUE7UUFDTixxQ0FBTyxDQUFBO0lBQ1IsQ0FBQyxFQUhpQixJQUFJLEdBQUosbUJBQUksS0FBSixtQkFBSSxRQUdyQjtJQUVZLHFCQUFNLEdBQUcsRUFBRSxJQUFJLHFCQUFhLEVBQVcsQ0FBQTtJQUVwRCxNQUFhLE9BQU87UUFHbkIsWUFDaUIsT0FBc0IsRUFDdEIsT0FBMEIsRUFDMUIsY0FBeUIsRUFDekIsY0FBc0M7WUFIdEMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtZQUN0QixZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUMxQixtQkFBYyxHQUFkLGNBQWMsQ0FBVztZQUN6QixtQkFBYyxHQUFkLGNBQWMsQ0FBd0I7WUFOOUMsU0FBSSx3QkFBZTtRQU96QixDQUFDO0tBQ0o7SUFUWSxzQkFBTyxVQVNuQixDQUFBO0FBR0YsQ0FBQyxFQXBCUyxjQUFjLEtBQWQsY0FBYyxRQW9CdkI7QUFFTSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7O2FBR3RCLHNCQUFpQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUMzRSxXQUFXLEVBQUUscUNBQXFDO1FBQ2xELG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUM5RCxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRTtRQUMvQyxVQUFVLDREQUFvRDtLQUM5RCxDQUFDLEFBTHVDLENBS3ZDO2FBRXFCLE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBbUM7YUFFcEMsYUFBUSxHQUFHLCtDQUF1QyxBQUExQyxDQUEwQztJQStCMUUsWUFDa0IsT0FBb0IsRUFDakIsa0JBQXVEO1FBRTNFLEtBQUssRUFBRSxDQUFBO1FBSFUsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNBLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUE3QjNELGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6QyxJQUFJLE9BQU8sRUFLUCxDQUNKLENBQUE7UUFDZSxZQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUE7UUFFckMsV0FBTSxHQUF5QixjQUFjLENBQUMsTUFBTSxDQUFBO1FBQ3BELGlCQUFZLEdBQXlCLGNBQWMsQ0FBQyxNQUFNLENBQUE7UUFDMUQsaUJBQVksR0FBYSxFQUFFLENBQUE7UUFFbEIscUJBQWdCLEdBQUc7WUFDbkMsVUFBVSxHQUFHLHFCQUFxQixDQUFDLEVBQUU7WUFDckMsVUFBVSxHQUFHLG9DQUFvQyxDQUFDLEVBQUU7WUFDcEQsVUFBVSxHQUFHLDhCQUE4QixDQUFDLEVBQUU7WUFDOUMsVUFBVSxHQUFHLDJCQUEyQixDQUFDLEVBQUU7WUFDM0MsVUFBVSxHQUFHLDBCQUEwQixDQUFDLEVBQUU7U0FDMUMsQ0FBQTtRQUtPLHFCQUFnQixHQUEyQixpQkFBZSxDQUFDLGlCQUFpQixDQUFBO1FBUW5GLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQTtRQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVuQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxQyxvREFBb0Q7WUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMzQyxJQUNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBZ0M7Z0JBQy9DLENBQUMsV0FBVztnQkFDWixJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxFQUNqRSxDQUFDO2dCQUNGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNaLENBQUM7WUFFRCxJQUNDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSx3Q0FBZ0M7Z0JBQ3JELENBQUMsV0FBVztnQkFDWixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxFQUN2RSxDQUFDO2dCQUNGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUNsQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLDZDQUE2QyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0RSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUNyRCxPQUFNO1lBQ1AsQ0FBQztZQUVELCtFQUErRTtZQUMvRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3BCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUVsQiw0Q0FBNEM7WUFDNUMsOEJBQThCO1lBQzlCLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsa0NBQXlCLENBQUE7WUFFbEUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDcEMsSUFDQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEtBQUssSUFBSTtnQkFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQ25GLENBQUM7Z0JBQ0YsR0FBRyxJQUFJLFVBQVUsQ0FBQTtZQUNsQixDQUFDO1lBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDVCxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHO2dCQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPO2dCQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPO2FBQzNCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQ3hFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixPQUFNO1lBQ1AsQ0FBQztZQUNELHVEQUF1RDtZQUN2RCx5Q0FBeUM7WUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1lBQzFFLElBQUksQ0FBQyxpQkFBaUI7Z0JBQ3JCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQTtZQUNwRixJQUFJLENBQUMsZ0JBQWdCO2dCQUNwQixJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxTQUFTLENBQUE7WUFDckYsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQW9CLEVBQUUsRUFBRTtZQUN2RCxJQUNDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUNqQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQzFCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUNyRSxFQUNBLENBQUM7Z0JBQ0YsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUMzRCxPQUFNO1lBQ1AsQ0FBQztZQUVELCtFQUErRTtZQUMvRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBRXBCLDRDQUE0QztZQUM1Qyw4QkFBOEI7WUFDOUIsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsa0NBQXlCLENBQUE7WUFFbEUsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDcEMsSUFDQyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEtBQUssSUFBSTtnQkFDakQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVU7b0JBQ2xELElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFDMUMsQ0FBQztnQkFDRixHQUFHLElBQUksVUFBVSxDQUFBO1lBQ2xCLENBQUM7WUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDbEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSTtnQkFDZixDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHO2dCQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPO2dCQUNqQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPO2FBQ2pDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsV0FBVztRQUNWLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLHdDQUFnQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQzVGLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBc0IsRUFBRSxPQUEwQixFQUFFLFVBQXFCO1FBQ3RGLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ2pCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25CLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ2hELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDakIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGlDQUF3QixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDakIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUVELE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRWpFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUE7UUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLGdDQUF1QixDQUFBO1FBQ3JFLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUN0RCxNQUFNLFFBQVEsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtZQUN2QyxPQUFPLENBQ04sVUFBVSxHQUFHLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUM7b0JBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUNqRCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsaURBQWlEO1FBQ2pELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RSxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUE7UUFDekIsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLEtBQUssTUFBTSxVQUFVLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQTtnQkFFMUQsSUFDQyxVQUFVO29CQUNWLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUN6RSxDQUFDO29CQUNGLGFBQWEsR0FBRyxJQUFJLENBQUE7b0JBQ3BCLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxtQkFBbUIsR0FBRyxVQUFVLENBQUE7UUFDcEMsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLGtFQUFrRTtZQUNsRSxNQUFNLHFCQUFxQixHQUFHLENBQUMsVUFBa0IsRUFBVyxFQUFFO2dCQUM3RCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNwRCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksV0FBVyxDQUFDLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQTtZQUNyRixDQUFDLENBQUE7WUFFRCxJQUFJLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtnQkFDdEMsTUFBTSxPQUFPLEdBQUcsVUFBVSxLQUFLLFNBQVMsQ0FBQTtnQkFDeEMsTUFBTSx1QkFBdUIsR0FBRyxVQUFVLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDdkYsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pGLE1BQU0sdUJBQXVCLEdBQUcscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2pFLE1BQU0sUUFBUSxHQUFHLENBQUMsdUJBQXVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtnQkFFckUsK0VBQStFO2dCQUMvRSxJQUFJLENBQUMsdUJBQXVCLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUM1RSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRTt3QkFDM0UsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRTt3QkFDNUUsVUFBVSxFQUFFLGlCQUFlLENBQUMsUUFBUTtxQkFDcEMsQ0FBQyxDQUFBO29CQUNGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO29CQUMzQixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDbkIsQ0FBQztxQkFBTSxJQUNOLHVCQUF1QjtvQkFDdkIsT0FBTztvQkFDUCxDQUFDLHVCQUF1QixJQUFJLENBQUMsdUJBQXVCLENBQUMsRUFDcEQsQ0FBQztvQkFDRixtQkFBbUIsSUFBSSxDQUFDLENBQUE7Z0JBQ3pCLENBQUM7cUJBQU0sSUFBSSx1QkFBdUIsSUFBSSxDQUFDLFFBQVEsSUFBSSx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7b0JBQzdFLG1CQUFtQixJQUFJLENBQUMsQ0FBQTtnQkFDekIsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFDTixVQUFVLEtBQUssQ0FBQztnQkFDaEIsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRTtvQkFDbkMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFDL0UsQ0FBQztnQkFDRix5REFBeUQ7Z0JBQ3pELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFO29CQUMzRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFO29CQUM1RSxVQUFVLEVBQUUsaUJBQWUsQ0FBQyxRQUFRO2lCQUNwQyxDQUFDLENBQUE7Z0JBRUYsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDbkIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO2dCQUNsQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7b0JBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNFLG1CQUFtQixJQUFJLENBQUMsQ0FBQTtZQUN6QixDQUFDO2lCQUFNLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQzlDLGdEQUFnRDtnQkFDaEQsd0NBQXdDO2dCQUN4QyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNuQixDQUFDO1lBQ0QscUJBQXFCLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFO1lBQ3JFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUU7WUFDNUUsVUFBVSxFQUFFLGlCQUFlLENBQUMsUUFBUTtTQUNwQyxDQUFDLENBQUE7UUFFRixJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEIsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDekMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ3RELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUE7UUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQTtJQUN6QyxDQUFDO0lBRUQsSUFBWSxLQUFLO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBWSxLQUFLLENBQUMsS0FBSztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsSUFBWSxXQUFXO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBWSxXQUFXLENBQUMsS0FBSztRQUM1QixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUN6QixJQUFJLENBQUMsa0NBQWtDLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQTtRQUN0QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQ3JELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFlLENBQUE7UUFDbkIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUE7WUFDNUIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUE7WUFDdkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hDLElBQUksR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLGtDQUFrQztRQUN6QyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO1lBQzNELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFlLENBQUE7UUFDbkIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDekMsSUFBSSxHQUFHLDBCQUEwQixDQUFBO1lBQ2pDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLEdBQUcsb0NBQW9DLENBQUE7WUFDNUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyw4QkFBOEIsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDOUMsSUFBSSxHQUFHLDJCQUEyQixDQUFBO1FBQ25DLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxHQUFHLHFCQUFxQixDQUFBO1FBQzdCLENBQUM7UUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRXhFLE1BQU0saUJBQWlCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1lBQ3pELFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7WUFDakQsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUU7WUFDL0MsVUFBVSw0REFBb0Q7U0FDOUQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFBO0lBQzFDLENBQUM7SUFFRCw2QkFBNkI7SUFDckIsb0JBQW9CO1FBQzNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDN0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNyRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2xGLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBa0I7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQXlDLEVBQUUsRUFBRTtZQUM1RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FDaEQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDckIsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFlBQW9CO1FBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUF5QyxFQUFFLEVBQUU7WUFDNUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUE7UUFDckMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsWUFBb0IsRUFBRSxVQUFrQjtRQUN2RSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBeUMsRUFBRSxFQUFFO1lBQzVFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoRixRQUFRLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RFLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWdCLEVBQUUsT0FBZ0I7UUFDL0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksd0NBQWdDLEVBQUUsQ0FBQztZQUNyRCxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQy9DLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUN4QiwyQkFBMkIsRUFDM0Isd0RBQXdELEVBQ3hELElBQUksQ0FBQyxpQkFBaUIsQ0FDdEIsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsa0JBQWtCLEVBQ2xCLHlCQUF5QixFQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQ3JCLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVksS0FBSyxDQUFDLEtBQWE7UUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQzVCLENBQUM7O0FBamZXLGVBQWU7SUE2Q3pCLFdBQUEsa0JBQWtCLENBQUE7R0E3Q1IsZUFBZSxDQWtmM0IifQ==