/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commonPrefixLength, commonSuffixLength } from '../../../../../base/common/strings.js';
export const _debugComposition = false;
export class TextAreaState {
    static { this.EMPTY = new TextAreaState('', 0, 0, null, undefined); }
    constructor(value, 
    /** the offset where selection starts inside `value` */
    selectionStart, 
    /** the offset where selection ends inside `value` */
    selectionEnd, 
    /** the editor range in the view coordinate system that matches the selection inside `value` */
    selection, 
    /** the visible line count (wrapped, not necessarily matching \n characters) for the text in `value` before `selectionStart` */
    newlineCountBeforeSelection) {
        this.value = value;
        this.selectionStart = selectionStart;
        this.selectionEnd = selectionEnd;
        this.selection = selection;
        this.newlineCountBeforeSelection = newlineCountBeforeSelection;
    }
    toString() {
        return `[ <${this.value}>, selectionStart: ${this.selectionStart}, selectionEnd: ${this.selectionEnd}]`;
    }
    static readFromTextArea(textArea, previousState) {
        const value = textArea.getValue();
        const selectionStart = textArea.getSelectionStart();
        const selectionEnd = textArea.getSelectionEnd();
        let newlineCountBeforeSelection = undefined;
        if (previousState) {
            const valueBeforeSelectionStart = value.substring(0, selectionStart);
            const previousValueBeforeSelectionStart = previousState.value.substring(0, previousState.selectionStart);
            if (valueBeforeSelectionStart === previousValueBeforeSelectionStart) {
                newlineCountBeforeSelection = previousState.newlineCountBeforeSelection;
            }
        }
        return new TextAreaState(value, selectionStart, selectionEnd, null, newlineCountBeforeSelection);
    }
    collapseSelection() {
        if (this.selectionStart === this.value.length) {
            return this;
        }
        return new TextAreaState(this.value, this.value.length, this.value.length, null, undefined);
    }
    isWrittenToTextArea(textArea, select) {
        const valuesEqual = this.value === textArea.getValue();
        if (!select) {
            return valuesEqual;
        }
        const selectionsEqual = this.selectionStart === textArea.getSelectionStart() &&
            this.selectionEnd === textArea.getSelectionEnd();
        return selectionsEqual && valuesEqual;
    }
    writeToTextArea(reason, textArea, select) {
        if (_debugComposition) {
            console.log(`writeToTextArea ${reason}: ${this.toString()}`);
        }
        textArea.setValue(reason, this.value);
        if (select) {
            textArea.setSelectionRange(reason, this.selectionStart, this.selectionEnd);
        }
    }
    deduceEditorPosition(offset) {
        if (offset <= this.selectionStart) {
            const str = this.value.substring(offset, this.selectionStart);
            return this._finishDeduceEditorPosition(this.selection?.getStartPosition() ?? null, str, -1);
        }
        if (offset >= this.selectionEnd) {
            const str = this.value.substring(this.selectionEnd, offset);
            return this._finishDeduceEditorPosition(this.selection?.getEndPosition() ?? null, str, 1);
        }
        const str1 = this.value.substring(this.selectionStart, offset);
        if (str1.indexOf(String.fromCharCode(8230)) === -1) {
            return this._finishDeduceEditorPosition(this.selection?.getStartPosition() ?? null, str1, 1);
        }
        const str2 = this.value.substring(offset, this.selectionEnd);
        return this._finishDeduceEditorPosition(this.selection?.getEndPosition() ?? null, str2, -1);
    }
    _finishDeduceEditorPosition(anchor, deltaText, signum) {
        let lineFeedCnt = 0;
        let lastLineFeedIndex = -1;
        while ((lastLineFeedIndex = deltaText.indexOf('\n', lastLineFeedIndex + 1)) !== -1) {
            lineFeedCnt++;
        }
        return [anchor, signum * deltaText.length, lineFeedCnt];
    }
    static deduceInput(previousState, currentState, couldBeEmojiInput) {
        if (!previousState) {
            // This is the EMPTY state
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: 0,
            };
        }
        if (_debugComposition) {
            console.log('------------------------deduceInput');
            console.log(`PREVIOUS STATE: ${previousState.toString()}`);
            console.log(`CURRENT STATE: ${currentState.toString()}`);
        }
        const prefixLength = Math.min(commonPrefixLength(previousState.value, currentState.value), previousState.selectionStart, currentState.selectionStart);
        const suffixLength = Math.min(commonSuffixLength(previousState.value, currentState.value), previousState.value.length - previousState.selectionEnd, currentState.value.length - currentState.selectionEnd);
        const previousValue = previousState.value.substring(prefixLength, previousState.value.length - suffixLength);
        const currentValue = currentState.value.substring(prefixLength, currentState.value.length - suffixLength);
        const previousSelectionStart = previousState.selectionStart - prefixLength;
        const previousSelectionEnd = previousState.selectionEnd - prefixLength;
        const currentSelectionStart = currentState.selectionStart - prefixLength;
        const currentSelectionEnd = currentState.selectionEnd - prefixLength;
        if (_debugComposition) {
            console.log(`AFTER DIFFING PREVIOUS STATE: <${previousValue}>, selectionStart: ${previousSelectionStart}, selectionEnd: ${previousSelectionEnd}`);
            console.log(`AFTER DIFFING CURRENT STATE: <${currentValue}>, selectionStart: ${currentSelectionStart}, selectionEnd: ${currentSelectionEnd}`);
        }
        if (currentSelectionStart === currentSelectionEnd) {
            // no current selection
            const replacePreviousCharacters = previousState.selectionStart - prefixLength;
            if (_debugComposition) {
                console.log(`REMOVE PREVIOUS: ${replacePreviousCharacters} chars`);
            }
            return {
                text: currentValue,
                replacePrevCharCnt: replacePreviousCharacters,
                replaceNextCharCnt: 0,
                positionDelta: 0,
            };
        }
        // there is a current selection => composition case
        const replacePreviousCharacters = previousSelectionEnd - previousSelectionStart;
        return {
            text: currentValue,
            replacePrevCharCnt: replacePreviousCharacters,
            replaceNextCharCnt: 0,
            positionDelta: 0,
        };
    }
    static deduceAndroidCompositionInput(previousState, currentState) {
        if (!previousState) {
            // This is the EMPTY state
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: 0,
            };
        }
        if (_debugComposition) {
            console.log('------------------------deduceAndroidCompositionInput');
            console.log(`PREVIOUS STATE: ${previousState.toString()}`);
            console.log(`CURRENT STATE: ${currentState.toString()}`);
        }
        if (previousState.value === currentState.value) {
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: currentState.selectionEnd - previousState.selectionEnd,
            };
        }
        const prefixLength = Math.min(commonPrefixLength(previousState.value, currentState.value), previousState.selectionEnd);
        const suffixLength = Math.min(commonSuffixLength(previousState.value, currentState.value), previousState.value.length - previousState.selectionEnd);
        const previousValue = previousState.value.substring(prefixLength, previousState.value.length - suffixLength);
        const currentValue = currentState.value.substring(prefixLength, currentState.value.length - suffixLength);
        const previousSelectionStart = previousState.selectionStart - prefixLength;
        const previousSelectionEnd = previousState.selectionEnd - prefixLength;
        const currentSelectionStart = currentState.selectionStart - prefixLength;
        const currentSelectionEnd = currentState.selectionEnd - prefixLength;
        if (_debugComposition) {
            console.log(`AFTER DIFFING PREVIOUS STATE: <${previousValue}>, selectionStart: ${previousSelectionStart}, selectionEnd: ${previousSelectionEnd}`);
            console.log(`AFTER DIFFING CURRENT STATE: <${currentValue}>, selectionStart: ${currentSelectionStart}, selectionEnd: ${currentSelectionEnd}`);
        }
        return {
            text: currentValue,
            replacePrevCharCnt: previousSelectionEnd,
            replaceNextCharCnt: previousValue.length - previousSelectionEnd,
            positionDelta: currentSelectionEnd - currentValue.length,
        };
    }
    static fromScreenReaderContentState(screenReaderContentState) {
        return new TextAreaState(screenReaderContentState.value, screenReaderContentState.selectionStart, screenReaderContentState.selectionEnd, screenReaderContentState.selection, screenReaderContentState.newlineCountBeforeSelection);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L3RleHRBcmVhL3RleHRBcmVhRWRpdENvbnRleHRTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUs5RixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUE7QUFrQnRDLE1BQU0sT0FBTyxhQUFhO2FBQ0YsVUFBSyxHQUFHLElBQUksYUFBYSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUUzRSxZQUNpQixLQUFhO0lBQzdCLHVEQUF1RDtJQUN2QyxjQUFzQjtJQUN0QyxxREFBcUQ7SUFDckMsWUFBb0I7SUFDcEMsK0ZBQStGO0lBQy9FLFNBQXVCO0lBQ3ZDLCtIQUErSDtJQUMvRywyQkFBK0M7UUFSL0MsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUViLG1CQUFjLEdBQWQsY0FBYyxDQUFRO1FBRXRCLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBRXBCLGNBQVMsR0FBVCxTQUFTLENBQWM7UUFFdkIsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFvQjtJQUM3RCxDQUFDO0lBRUcsUUFBUTtRQUNkLE9BQU8sTUFBTSxJQUFJLENBQUMsS0FBSyxzQkFBc0IsSUFBSSxDQUFDLGNBQWMsbUJBQW1CLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQTtJQUN4RyxDQUFDO0lBRU0sTUFBTSxDQUFDLGdCQUFnQixDQUM3QixRQUEwQixFQUMxQixhQUFtQztRQUVuQyxNQUFNLEtB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