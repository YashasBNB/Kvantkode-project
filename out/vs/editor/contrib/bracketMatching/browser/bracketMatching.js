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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldE1hdGNoaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvYnJhY2tldE1hdGNoaW5nL2Jyb3dzZXIvYnJhY2tldE1hdGNoaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFDTixZQUFZLEVBRVosb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUUxQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXBGLE1BQU0sbUNBQW1DLEdBQUcsYUFBYSxDQUN4RCw0Q0FBNEMsRUFDNUMsU0FBUyxFQUNULEdBQUcsQ0FBQyxRQUFRLENBQ1gscUNBQXFDLEVBQ3JDLG9EQUFvRCxDQUNwRCxDQUNELENBQUE7QUFFRCxNQUFNLG1CQUFvQixTQUFRLFlBQVk7SUFDN0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNkJBQTZCO1lBQ2pDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHlCQUF5QixFQUFFLGVBQWUsQ0FBQztZQUNoRSxZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7Z0JBQ3pDLE9BQU8sRUFBRSxtREFBNkIsNkJBQW9CO2dCQUMxRCxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDdkQsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBc0IsU0FBUSxZQUFZO0lBQy9DO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxtQkFBbUIsQ0FBQztZQUN4RSxZQUFZLEVBQUUsU0FBUztZQUN2QixRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQ3pCLHdDQUF3QyxFQUN4QyxtRUFBbUUsQ0FDbkU7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMO3dCQUNDLElBQUksRUFBRSxNQUFNO3dCQUNaLE1BQU0sRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxVQUFVLEVBQUU7Z0NBQ1gsY0FBYyxFQUFFO29DQUNmLElBQUksRUFBRSxTQUFTO29DQUNmLE9BQU8sRUFBRSxJQUFJO2lDQUNiOzZCQUNEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSxJQUFTO1FBQ3BFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQTtRQUN6QixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzNDLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFDdkIsQ0FBQztRQUNELHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdkUsQ0FBQztDQUNEO0FBQ0QsTUFBTSxvQkFBcUIsU0FBUSxZQUFZO0lBQzlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxpQkFBaUIsQ0FBQztZQUNyRSxZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7Z0JBQ3pDLE9BQU8sRUFBRSxnREFBMkIsNEJBQW9CO2dCQUN4RCxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0NBQ0Q7QUFJRCxNQUFNLFlBQVk7SUFLakIsWUFBWSxRQUFrQixFQUFFLFFBQXlCLEVBQUUsT0FBK0I7UUFDekYsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7YUFDakMsT0FBRSxHQUFHLDBDQUEwQyxDQUFBO0lBRS9ELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUE0Qix5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBVUQsWUFBWSxNQUFtQjtRQUM5QixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUE7UUFDOUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN0RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMscUNBQTRCLENBQUE7UUFFeEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNyQywwQ0FBMEM7Z0JBQzFDLDhHQUE4RztnQkFDOUcsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxDQUFDLFVBQVUscUNBQTRCLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMscUNBQTRCLENBQUE7Z0JBQ3hFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFBO2dCQUN2QixJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDcEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDakMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sYUFBYTtRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3BFLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBRTdDLHFEQUFxRDtZQUNyRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMxRCxJQUFJLGlCQUFpQixHQUFvQixJQUFJLENBQUE7WUFDN0MsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUN2RixpQkFBaUIsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtnQkFDbkQsQ0FBQztxQkFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUNuRCxpQkFBaUIsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtnQkFDbkQsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCwwRUFBMEU7Z0JBQzFFLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDNUUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUN2QixpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO2dCQUM1RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AseURBQXlEO29CQUN6RCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDaEUsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUN0QyxpQkFBaUIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7b0JBQ3pELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxTQUFTLENBQ25CLGlCQUFpQixDQUFDLFVBQVUsRUFDNUIsaUJBQWlCLENBQUMsTUFBTSxFQUN4QixpQkFBaUIsQ0FBQyxVQUFVLEVBQzVCLGlCQUFpQixDQUFDLE1BQU0sQ0FDeEIsQ0FBQTtZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksU0FBUyxDQUNuQixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxFQUNmLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLENBQ2YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLGVBQWUsQ0FBQyxjQUF1QjtRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLGFBQWEsR0FBZ0IsRUFBRSxDQUFBO1FBRXJDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDbEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDN0MsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFeEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUM3RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2YsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ2hFLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDdEMsUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO29CQUNqRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxVQUFVLEdBQW9CLElBQUksQ0FBQTtZQUN0QyxJQUFJLFFBQVEsR0FBb0IsSUFBSSxDQUFBO1lBRXBDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtnQkFDN0MsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxRQUFRLENBQUE7Z0JBQzlCLFVBQVUsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQzdFLFFBQVEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7Z0JBRTdFLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLDREQUE0RDtvQkFDNUQsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFBO29CQUN0QixVQUFVLEdBQUcsUUFBUSxDQUFBO29CQUNyQixRQUFRLEdBQUcsR0FBRyxDQUFBO2dCQUNmLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxVQUFVLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQzVCLGFBQWEsQ0FBQyxJQUFJLENBQ2pCLElBQUksU0FBUyxDQUNaLFVBQVUsQ0FBQyxVQUFVLEVBQ3JCLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLENBQ2YsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBQ00sY0FBYyxDQUFDLFVBQW1CO1FBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDbEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBRXhDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixRQUFRLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM5RCxDQUFDO1lBQ0QsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO2dCQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUU7b0JBQ3JDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFO29CQUNoQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtpQkFDaEMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzthQUV1Qiw0Q0FBdUMsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQ2hHO1FBQ0MsV0FBVyxFQUFFLHdCQUF3QjtRQUNyQyxVQUFVLDREQUFvRDtRQUM5RCxTQUFTLEVBQUUsZUFBZTtRQUMxQixhQUFhLEVBQUU7WUFDZCxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsbUNBQW1DLENBQUM7WUFDNUQsUUFBUSxFQUFFLGlCQUFpQixDQUFDLE1BQU07U0FDbEM7S0FDRCxDQUNELENBQUE7YUFFdUIsK0NBQTBDLEdBQ2pFLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUMvQixXQUFXLEVBQUUsMkJBQTJCO1FBQ3hDLFVBQVUsNERBQW9EO1FBQzlELFNBQVMsRUFBRSxlQUFlO0tBQzFCLENBQUMsQ0FBQTtJQUVLLGVBQWU7UUFDdEIsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFekIsTUFBTSxjQUFjLEdBQTRCLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtRQUN6QixLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUE7WUFDckMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUMxRixjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdEMsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUNoRSx1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQTtZQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDL0MsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzdCLHFEQUFxRDtZQUNyRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFBO1lBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDdEMsSUFBSSxZQUFZLEdBQW1CLEVBQUUsQ0FBQTtRQUNyQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkMsb0VBQW9FO1lBQ3BFLFlBQVksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUE7UUFDdEMsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUvQixJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUN6QixpRUFBaUU7Z0JBQ2pFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3pELENBQUM7UUFDRixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQW1CLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUE7UUFDbEIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUE7UUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUU3QixPQUNDLGFBQWEsR0FBRyxXQUFXO2dCQUMzQixZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDdEQsQ0FBQztnQkFDRixhQUFhLEVBQUUsQ0FBQTtZQUNoQixDQUFDO1lBRUQsSUFBSSxhQUFhLEdBQUcsV0FBVyxJQUFJLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzFGLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUNwRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQzdDLFFBQVEsRUFDUixFQUFFLENBQUMsa0NBQWtDLENBQ3JDLENBQUE7Z0JBQ0QsSUFBSSxPQUFPLEdBQUcseUJBQXlCLENBQUMsdUNBQXVDLENBQUE7Z0JBQy9FLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDbkQsUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQ2xELFFBQVEsRUFDUixFQUFFLENBQUMsa0NBQWtDLENBQ3JDLENBQUE7b0JBQ0QsT0FBTyxHQUFHLHlCQUF5QixDQUFDLDBDQUEwQyxDQUFBO2dCQUMvRSxDQUFDO2dCQUNELE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDdEUsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO0lBQ2hDLENBQUM7O0FBR0YsMEJBQTBCLENBQ3pCLHlCQUF5QixDQUFDLEVBQUUsRUFDNUIseUJBQXlCLDJEQUV6QixDQUFBO0FBQ0Qsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3pDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUE7QUFFMUMsYUFBYTtBQUNiLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRTtJQUNqRCxLQUFLLEVBQUUsY0FBYztJQUNyQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsNkJBQTZCO1FBQ2pDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM1RCxpQkFBaUIsQ0FDakI7S0FDRDtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBIn0=