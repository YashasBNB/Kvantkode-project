/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { findFirstMax } from '../../../../../base/common/arraysFind.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { SelectedSuggestionInfo, } from '../../../../common/languages.js';
import { singleTextEditAugments, singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { SnippetParser } from '../../../snippet/browser/snippetParser.js';
import { SnippetSession } from '../../../snippet/browser/snippetSession.js';
import { SuggestController } from '../../../suggest/browser/suggestController.js';
import { observableFromEvent } from '../../../../../base/common/observable.js';
export class SuggestWidgetAdaptor extends Disposable {
    get selectedItem() {
        return this._currentSuggestItemInfo;
    }
    constructor(editor, suggestControllerPreselector, onWillAccept) {
        super();
        this.editor = editor;
        this.suggestControllerPreselector = suggestControllerPreselector;
        this.onWillAccept = onWillAccept;
        this.isSuggestWidgetVisible = false;
        this.isShiftKeyPressed = false;
        this._isActive = false;
        this._currentSuggestItemInfo = undefined;
        this._onDidSelectedItemChange = this._register(new Emitter());
        this.onDidSelectedItemChange = this._onDidSelectedItemChange.event;
        // See the command acceptAlternativeSelectedSuggestion that is bound to shift+tab
        this._register(editor.onKeyDown((e) => {
            if (e.shiftKey && !this.isShiftKeyPressed) {
                this.isShiftKeyPressed = true;
                this.update(this._isActive);
            }
        }));
        this._register(editor.onKeyUp((e) => {
            if (e.shiftKey && this.isShiftKeyPressed) {
                this.isShiftKeyPressed = false;
                this.update(this._isActive);
            }
        }));
        const suggestController = SuggestController.get(this.editor);
        if (suggestController) {
            this._register(suggestController.registerSelector({
                priority: 100,
                select: (model, pos, suggestItems) => {
                    const textModel = this.editor.getModel();
                    if (!textModel) {
                        // Should not happen
                        return -1;
                    }
                    const i = this.suggestControllerPreselector();
                    const itemToPreselect = i ? singleTextRemoveCommonPrefix(i, textModel) : undefined;
                    if (!itemToPreselect) {
                        return -1;
                    }
                    const position = Position.lift(pos);
                    const candidates = suggestItems
                        .map((suggestItem, index) => {
                        const suggestItemInfo = SuggestItemInfo.fromSuggestion(suggestController, textModel, position, suggestItem, this.isShiftKeyPressed);
                        const suggestItemTextEdit = singleTextRemoveCommonPrefix(suggestItemInfo.toSingleTextEdit(), textModel);
                        const valid = singleTextEditAugments(itemToPreselect, suggestItemTextEdit);
                        return { index, valid, prefixLength: suggestItemTextEdit.text.length, suggestItem };
                    })
                        .filter((item) => item && item.valid && item.prefixLength > 0);
                    const result = findFirstMax(candidates, compareBy((s) => s.prefixLength, numberComparator));
                    return result ? result.index : -1;
                },
            }));
            let isBoundToSuggestWidget = false;
            const bindToSuggestWidget = () => {
                if (isBoundToSuggestWidget) {
                    return;
                }
                isBoundToSuggestWidget = true;
                this._register(suggestController.widget.value.onDidShow(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
                this._register(suggestController.widget.value.onDidHide(() => {
                    this.isSuggestWidgetVisible = false;
                    this.update(false);
                }));
                this._register(suggestController.widget.value.onDidFocus(() => {
                    this.isSuggestWidgetVisible = true;
                    this.update(true);
                }));
            };
            this._register(Event.once(suggestController.model.onDidTrigger)((e) => {
                bindToSuggestWidget();
            }));
            this._register(suggestController.onWillInsertSuggestItem((e) => {
                const position = this.editor.getPosition();
                const model = this.editor.getModel();
                if (!position || !model) {
                    return undefined;
                }
                const suggestItemInfo = SuggestItemInfo.fromSuggestion(suggestController, model, position, e.item, this.isShiftKeyPressed);
                this.onWillAccept(suggestItemInfo);
            }));
        }
        this.update(this._isActive);
    }
    update(newActive) {
        const newInlineCompletion = this.getSuggestItemInfo();
        if (this._isActive !== newActive ||
            !suggestItemInfoEquals(this._currentSuggestItemInfo, newInlineCompletion)) {
            this._isActive = newActive;
            this._currentSuggestItemInfo = newInlineCompletion;
            this._onDidSelectedItemChange.fire();
        }
    }
    getSuggestItemInfo() {
        const suggestController = SuggestController.get(this.editor);
        if (!suggestController || !this.isSuggestWidgetVisible) {
            return undefined;
        }
        const focusedItem = suggestController.widget.value.getFocusedItem();
        const position = this.editor.getPosition();
        const model = this.editor.getModel();
        if (!focusedItem || !position || !model) {
            return undefined;
        }
        return SuggestItemInfo.fromSuggestion(suggestController, model, position, focusedItem.item, this.isShiftKeyPressed);
    }
    stopForceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        suggestController?.stopForceRenderingAbove();
    }
    forceRenderingAbove() {
        const suggestController = SuggestController.get(this.editor);
        suggestController?.forceRenderingAbove();
    }
}
export class SuggestItemInfo {
    static fromSuggestion(suggestController, model, position, item, toggleMode) {
        let { insertText } = item.completion;
        let isSnippetText = false;
        if (item.completion.insertTextRules & 4 /* CompletionItemInsertTextRule.InsertAsSnippet */) {
            const snippet = new SnippetParser().parse(insertText);
            if (snippet.children.length < 100) {
                // Adjust whitespace is expensive.
                SnippetSession.adjustWhitespace(model, position, true, snippet);
            }
            insertText = snippet.toString();
            isSnippetText = true;
        }
        const info = suggestController.getOverwriteInfo(item, toggleMode);
        return new SuggestItemInfo(Range.fromPositions(position.delta(0, -info.overwriteBefore), position.delta(0, Math.max(info.overwriteAfter, 0))), insertText, item.completion.kind, isSnippetText);
    }
    constructor(range, insertText, completionItemKind, isSnippetText) {
        this.range = range;
        this.insertText = insertText;
        this.completionItemKind = completionItemKind;
        this.isSnippetText = isSnippetText;
    }
    equals(other) {
        return (this.range.equalsRange(other.range) &&
            this.insertText === other.insertText &&
            this.completionItemKind === other.completionItemKind &&
            this.isSnippetText === other.isSnippetText);
    }
    toSelectedSuggestionInfo() {
        return new SelectedSuggestionInfo(this.range, this.insertText, this.completionItemKind, this.isSnippetText);
    }
    toSingleTextEdit() {
        return new SingleTextEdit(this.range, this.insertText);
    }
}
function suggestItemInfoEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return a.equals(b);
}
export class ObservableSuggestWidgetAdapter extends Disposable {
    constructor(_editorObs, _handleSuggestAccepted, _suggestControllerPreselector) {
        super();
        this._editorObs = _editorObs;
        this._handleSuggestAccepted = _handleSuggestAccepted;
        this._suggestControllerPreselector = _suggestControllerPreselector;
        this._suggestWidgetAdaptor = this._register(new SuggestWidgetAdaptor(this._editorObs.editor, () => {
            this._editorObs.forceUpdate();
            return this._suggestControllerPreselector();
        }, (item) => this._editorObs.forceUpdate((_tx) => {
            /** @description InlineCompletionsController.handleSuggestAccepted */
            this._handleSuggestAccepted(item);
        })));
        this.selectedItem = observableFromEvent(this, (cb) => this._suggestWidgetAdaptor.onDidSelectedItemChange(() => {
            this._editorObs.forceUpdate((_tx) => cb(undefined));
        }), () => this._suggestWidgetAdaptor.selectedItem);
    }
    stopForceRenderingAbove() {
        this._suggestWidgetAdaptor.stopForceRenderingAbove();
    }
    forceRenderingAbove() {
        this._suggestWidgetAdaptor.forceRenderingAbove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldEFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL3N1Z2dlc3RXaWRnZXRBZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUdOLHNCQUFzQixHQUN0QixNQUFNLGlDQUFpQyxDQUFBO0FBRXhDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFOUUsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFLbkQsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFBO0lBQ3BDLENBQUM7SUFJRCxZQUNrQixNQUFtQixFQUNuQiw0QkFBOEQsRUFDOUQsWUFBNkM7UUFFOUQsS0FBSyxFQUFFLENBQUE7UUFKVSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBa0M7UUFDOUQsaUJBQVksR0FBWixZQUFZLENBQWlDO1FBYnZELDJCQUFzQixHQUFZLEtBQUssQ0FBQTtRQUN2QyxzQkFBaUIsR0FBRyxLQUFLLENBQUE7UUFDekIsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQiw0QkFBdUIsR0FBZ0MsU0FBUyxDQUFBO1FBSWhFLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3RELDRCQUF1QixHQUFnQixJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBU3pGLGlGQUFpRjtRQUNqRixJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QixJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7Z0JBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsU0FBUyxDQUNiLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDO2dCQUNsQyxRQUFRLEVBQUUsR0FBRztnQkFDYixNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxFQUFFO29CQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO29CQUN4QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2hCLG9CQUFvQjt3QkFDcEIsT0FBTyxDQUFDLENBQUMsQ0FBQTtvQkFDVixDQUFDO29CQUVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO29CQUM3QyxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO29CQUNsRixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7d0JBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUE7b0JBQ1YsQ0FBQztvQkFDRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUVuQyxNQUFNLFVBQVUsR0FBRyxZQUFZO3lCQUM3QixHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQzNCLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQ3JELGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsUUFBUSxFQUNSLFdBQVcsRUFDWCxJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQUE7d0JBQ0QsTUFBTSxtQkFBbUIsR0FBRyw0QkFBNEIsQ0FDdkQsZUFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQ2xDLFNBQVMsQ0FDVCxDQUFBO3dCQUNELE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO3dCQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQTtvQkFDcEYsQ0FBQyxDQUFDO3lCQUNELE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFFL0QsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUMxQixVQUFVLEVBQ1YsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFFLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQ25ELENBQUE7b0JBQ0QsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO2FBQ0QsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLHNCQUFzQixHQUFHLEtBQUssQ0FBQTtZQUNsQyxNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtnQkFDaEMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO29CQUM1QixPQUFNO2dCQUNQLENBQUM7Z0JBQ0Qsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO2dCQUU3QixJQUFJLENBQUMsU0FBUyxDQUNiLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtvQkFDN0MsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtvQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtvQkFDN0MsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQTtvQkFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDOUMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtvQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUMsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDdEQsbUJBQW1CLEVBQUUsQ0FBQTtZQUN0QixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMvQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUMxQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNwQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3pCLE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO2dCQUVELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQ3JELGlCQUFpQixFQUNqQixLQUFLLEVBQ0wsUUFBUSxFQUNSLENBQUMsQ0FBQyxJQUFJLEVBQ04sSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO2dCQUVELElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRU8sTUFBTSxDQUFDLFNBQWtCO1FBQ2hDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFFckQsSUFDQyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDNUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsbUJBQW1CLENBQUMsRUFDeEUsQ0FBQztZQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1lBQzFCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxtQkFBbUIsQ0FBQTtZQUVsRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ3hELE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ25FLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUVwQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sZUFBZSxDQUFDLGNBQWMsQ0FDcEMsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxRQUFRLEVBQ1IsV0FBVyxDQUFDLElBQUksRUFDaEIsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUQsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQTtJQUM3QyxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RCxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxDQUFBO0lBQ3pDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBQ3BCLE1BQU0sQ0FBQyxjQUFjLENBQzNCLGlCQUFvQyxFQUNwQyxLQUFpQixFQUNqQixRQUFrQixFQUNsQixJQUFvQixFQUNwQixVQUFtQjtRQUVuQixJQUFJLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUNwQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUE7UUFDekIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWdCLHVEQUErQyxFQUFFLENBQUM7WUFDckYsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7WUFFckQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztnQkFDbkMsa0NBQWtDO2dCQUNsQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDaEUsQ0FBQztZQUVELFVBQVUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDL0IsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUNyQixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRWpFLE9BQU8sSUFBSSxlQUFlLENBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQ2xCLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUN4QyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDbkQsRUFDRCxVQUFVLEVBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQ3BCLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQ2lCLEtBQVksRUFDWixVQUFrQixFQUNsQixrQkFBc0MsRUFDdEMsYUFBc0I7UUFIdEIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztJQUNwQyxDQUFDO0lBRUcsTUFBTSxDQUFDLEtBQXNCO1FBQ25DLE9BQU8sQ0FDTixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ25DLElBQUksQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFVBQVU7WUFDcEMsSUFBSSxDQUFDLGtCQUFrQixLQUFLLEtBQUssQ0FBQyxrQkFBa0I7WUFDcEQsSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixPQUFPLElBQUksc0JBQXNCLENBQ2hDLElBQUksQ0FBQyxLQUFLLEVBQ1YsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQ2xCLENBQUE7SUFDRixDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkQsQ0FBQztDQUNEO0FBRUQsU0FBUyxxQkFBcUIsQ0FDN0IsQ0FBOEIsRUFDOUIsQ0FBOEI7SUFFOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDbkIsQ0FBQztBQUVELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxVQUFVO0lBeUI3RCxZQUNrQixVQUFnQyxFQUVoQyxzQkFBdUQsRUFDdkQsNkJBQStEO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBTFUsZUFBVSxHQUFWLFVBQVUsQ0FBc0I7UUFFaEMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFpQztRQUN2RCxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWtDO1FBNUJoRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN0RCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFDdEIsR0FBRyxFQUFFO1lBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM3QixPQUFPLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1FBQzVDLENBQUMsRUFDRCxDQUFDLElBQUksRUFBRSxFQUFFLENBQ1IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNuQyxxRUFBcUU7WUFDckUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxDQUNILENBQ0QsQ0FBQTtRQUVlLGlCQUFZLEdBQUcsbUJBQW1CLENBQ2pELElBQUksRUFDSixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04sSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsQ0FBQyxDQUFDLEVBQ0gsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FDN0MsQ0FBQTtJQVNELENBQUM7SUFFTSx1QkFBdUI7UUFDN0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFLENBQUE7SUFDckQsQ0FBQztJQUVNLG1CQUFtQjtRQUN6QixJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUNqRCxDQUFDO0NBQ0QifQ==