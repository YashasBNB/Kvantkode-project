/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import './bracketMatching.css';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { OverviewRulerLane, } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
const overviewRulerBracketMatchForeground = registerColor('editorOverviewRuler.bracketMatchForeground', '#A0A0A0', nls.localize('overviewRulerBracketMatchForeground', 'Overview ruler marker color for matching brackets.'));
class JumpToBracketAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.jumpToBracket',
            label: nls.localize2('smartSelect.jumpBracket', 'Go to Bracket'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        BracketMatchingController.get(editor)?.jumpToBracket();
    }
}
class SelectToBracketAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.selectToBracket',
            label: nls.localize2('smartSelect.selectToBracket', 'Select to Bracket'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('smartSelect.selectToBracketDescription', 'Select the text inside and including the brackets or curly braces'),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            properties: {
                                selectBrackets: {
                                    type: 'boolean',
                                    default: true,
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    run(accessor, editor, args) {
        let selectBrackets = true;
        if (args && args.selectBrackets === false) {
            selectBrackets = false;
        }
        BracketMatchingController.get(editor)?.selectToBracket(selectBrackets);
    }
}
class RemoveBracketsAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.removeBrackets',
            label: nls.localize2('smartSelect.removeBrackets', 'Remove Brackets'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        BracketMatchingController.get(editor)?.removeBrackets(this.id);
    }
}
class BracketsData {
    constructor(position, brackets, options) {
        this.position = position;
        this.brackets = brackets;
        this.options = options;
    }
}
export class BracketMatchingController extends Disposable {
    static { this.ID = 'editor.contrib.bracketMatchingController'; }
    static get(editor) {
        return editor.getContribution(BracketMatchingController.ID);
    }
    constructor(editor) {
        super();
        this._editor = editor;
        this._lastBracketsData = [];
        this._lastVersionId = 0;
        this._decorations = this._editor.createDecorationsCollection();
        this._updateBracketsSoon = this._register(new RunOnceScheduler(() => this._updateBrackets(), 50));
        this._matchBrackets = this._editor.getOption(73 /* EditorOption.matchBrackets */);
        this._updateBracketsSoon.schedule();
        this._register(editor.onDidChangeCursorPosition((e) => {
            if (this._matchBrackets === 'never') {
                // Early exit if nothing needs to be done!
                // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
                return;
            }
            this._updateBracketsSoon.schedule();
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            this._updateBracketsSoon.schedule();
        }));
        this._register(editor.onDidChangeModel((e) => {
            this._lastBracketsData = [];
            this._updateBracketsSoon.schedule();
        }));
        this._register(editor.onDidChangeModelLanguageConfiguration((e) => {
            this._lastBracketsData = [];
            this._updateBracketsSoon.schedule();
        }));
        this._register(editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(73 /* EditorOption.matchBrackets */)) {
                this._matchBrackets = this._editor.getOption(73 /* EditorOption.matchBrackets */);
                this._decorations.clear();
                this._lastBracketsData = [];
                this._lastVersionId = 0;
                this._updateBracketsSoon.schedule();
            }
        }));
        this._register(editor.onDidBlurEditorWidget(() => {
            this._updateBracketsSoon.schedule();
        }));
        this._register(editor.onDidFocusEditorWidget(() => {
            this._updateBracketsSoon.schedule();
        }));
    }
    jumpToBracket() {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const newSelections = this._editor.getSelections().map((selection) => {
            const position = selection.getStartPosition();
            // find matching brackets if position is on a bracket
            const brackets = model.bracketPairs.matchBracket(position);
            let newCursorPosition = null;
            if (brackets) {
                if (brackets[0].containsPosition(position) && !brackets[1].containsPosition(position)) {
                    newCursorPosition = brackets[1].getStartPosition();
                }
                else if (brackets[1].containsPosition(position)) {
                    newCursorPosition = brackets[0].getStartPosition();
                }
            }
            else {
                // find the enclosing brackets if the position isn't on a matching bracket
                const enclosingBrackets = model.bracketPairs.findEnclosingBrackets(position);
                if (enclosingBrackets) {
                    newCursorPosition = enclosingBrackets[1].getStartPosition();
                }
                else {
                    // no enclosing brackets, try the very first next bracket
                    const nextBracket = model.bracketPairs.findNextBracket(position);
                    if (nextBracket && nextBracket.range) {
                        newCursorPosition = nextBracket.range.getStartPosition();
                    }
                }
            }
            if (newCursorPosition) {
                return new Selection(newCursorPosition.lineNumber, newCursorPosition.column, newCursorPosition.lineNumber, newCursorPosition.column);
            }
            return new Selection(position.lineNumber, position.column, position.lineNumber, position.column);
        });
        this._editor.setSelections(newSelections);
        this._editor.revealRange(newSelections[0]);
    }
    selectToBracket(selectBrackets) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const newSelections = [];
        this._editor.getSelections().forEach((selection) => {
            const position = selection.getStartPosition();
            let brackets = model.bracketPairs.matchBracket(position);
            if (!brackets) {
                brackets = model.bracketPairs.findEnclosingBrackets(position);
                if (!brackets) {
                    const nextBracket = model.bracketPairs.findNextBracket(position);
                    if (nextBracket && nextBracket.range) {
                        brackets = model.bracketPairs.matchBracket(nextBracket.range.getStartPosition());
                    }
                }
            }
            let selectFrom = null;
            let selectTo = null;
            if (brackets) {
                brackets.sort(Range.compareRangesUsingStarts);
                const [open, close] = brackets;
                selectFrom = selectBrackets ? open.getStartPosition() : open.getEndPosition();
                selectTo = selectBrackets ? close.getEndPosition() : close.getStartPosition();
                if (close.containsPosition(position)) {
                    // select backwards if the cursor was on the closing bracket
                    const tmp = selectFrom;
                    selectFrom = selectTo;
                    selectTo = tmp;
                }
            }
            if (selectFrom && selectTo) {
                newSelections.push(new Selection(selectFrom.lineNumber, selectFrom.column, selectTo.lineNumber, selectTo.column));
            }
        });
        if (newSelections.length > 0) {
            this._editor.setSelections(newSelections);
            this._editor.revealRange(newSelections[0]);
        }
    }
    removeBrackets(editSource) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        this._editor.getSelections().forEach((selection) => {
            const position = selection.getPosition();
            let brackets = model.bracketPairs.matchBracket(position);
            if (!brackets) {
                brackets = model.bracketPairs.findEnclosingBrackets(position);
            }
            if (brackets) {
                this._editor.pushUndoStop();
                this._editor.executeEdits(editSource, [
                    { range: brackets[0], text: '' },
                    { range: brackets[1], text: '' },
                ]);
                this._editor.pushUndoStop();
            }
        });
    }
    static { this._DECORATION_OPTIONS_WITH_OVERVIEW_RULER = ModelDecorationOptions.register({
        description: 'bracket-match-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'bracket-match',
        overviewRuler: {
            color: themeColorFromId(overviewRulerBracketMatchForeground),
            position: OverviewRulerLane.Center,
        },
    }); }
    static { this._DECORATION_OPTIONS_WITHOUT_OVERVIEW_RULER = ModelDecorationOptions.register({
        description: 'bracket-match-no-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'bracket-match',
    }); }
    _updateBrackets() {
        if (this._matchBrackets === 'never') {
            return;
        }
        this._recomputeBrackets();
        const newDecorations = [];
        let newDecorationsLen = 0;
        for (const bracketData of this._lastBracketsData) {
            const brackets = bracketData.brackets;
            if (brackets) {
                newDecorations[newDecorationsLen++] = { range: brackets[0], options: bracketData.options };
                newDecorations[newDecorationsLen++] = { range: brackets[1], options: bracketData.options };
            }
        }
        this._decorations.set(newDecorations);
    }
    _recomputeBrackets() {
        if (!this._editor.hasModel() || !this._editor.hasWidgetFocus()) {
            // no model or no focus => no brackets!
            this._lastBracketsData = [];
            this._lastVersionId = 0;
            return;
        }
        const selections = this._editor.getSelections();
        if (selections.length > 100) {
            // no bracket matching for high numbers of selections
            this._lastBracketsData = [];
            this._lastVersionId = 0;
            return;
        }
        const model = this._editor.getModel();
        const versionId = model.getVersionId();
        let previousData = [];
        if (this._lastVersionId === versionId) {
            // use the previous data only if the model is at the same version id
            previousData = this._lastBracketsData;
        }
        const positions = [];
        let positionsLen = 0;
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                // will bracket match a cursor only if the selection is collapsed
                positions[positionsLen++] = selection.getStartPosition();
            }
        }
        // sort positions for `previousData` cache hits
        if (positions.length > 1) {
            positions.sort(Position.compare);
        }
        const newData = [];
        let newDataLen = 0;
        let previousIndex = 0;
        const previousLen = previousData.length;
        for (let i = 0, len = positions.length; i < len; i++) {
            const position = positions[i];
            while (previousIndex < previousLen &&
                previousData[previousIndex].position.isBefore(position)) {
                previousIndex++;
            }
            if (previousIndex < previousLen && previousData[previousIndex].position.equals(position)) {
                newData[newDataLen++] = previousData[previousIndex];
            }
            else {
                let brackets = model.bracketPairs.matchBracket(position, 20 /* give at most 20ms to compute */);
                let options = BracketMatchingController._DECORATION_OPTIONS_WITH_OVERVIEW_RULER;
                if (!brackets && this._matchBrackets === 'always') {
                    brackets = model.bracketPairs.findEnclosingBrackets(position, 20 /* give at most 20ms to compute */);
                    options = BracketMatchingController._DECORATION_OPTIONS_WITHOUT_OVERVIEW_RULER;
                }
                newData[newDataLen++] = new BracketsData(position, brackets, options);
            }
        }
        this._lastBracketsData = newData;
        this._lastVersionId = versionId;
    }
}
registerEditorContribution(BracketMatchingController.ID, BracketMatchingController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(SelectToBracketAction);
registerEditorAction(JumpToBracketAction);
registerEditorAction(RemoveBracketsAction);
// Go to menu
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '5_infile_nav',
    command: {
        id: 'editor.action.jumpToBracket',
        title: nls.localize({ key: 'miGoToBracket', comment: ['&& denotes a mnemonic'] }, 'Go to &&Bracket'),
    },
    order: 2,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldE1hdGNoaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9icmFja2V0TWF0Y2hpbmcvYnJvd3Nlci9icmFja2V0TWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsTUFBTSxtQ0FBbUMsR0FBRyxhQUFhLENBQ3hELDRDQUE0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