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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC90ZXh0QXJlYS90ZXh0QXJlYUVkaXRDb250ZXh0U3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFLOUYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFBO0FBa0J0QyxNQUFNLE9BQU8sYUFBYTthQUNGLFVBQUssR0FBRyxJQUFJLGFBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFFM0UsWUFDaUIsS0FBYTtJQUM3Qix1REFBdUQ7SUFDdkMsY0FBc0I7SUFDdEMscURBQXFEO0lBQ3JDLFlBQW9CO0lBQ3BDLCtGQUErRjtJQUMvRSxTQUF1QjtJQUN2QywrSEFBK0g7SUFDL0csMkJBQStDO1FBUi9DLFVBQUssR0FBTCxLQUFLLENBQVE7UUFFYixtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUV0QixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUVwQixjQUFTLEdBQVQsU0FBUyxDQUFjO1FBRXZCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBb0I7SUFDN0QsQ0FBQztJQUVHLFFBQVE7UUFDZCxPQUFPLE1BQU0sSUFBSSxDQUFDLEtBQUssc0JBQXNCLElBQUksQ0FBQyxjQUFjLG1CQUFtQixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUE7SUFDeEcsQ0FBQztJQUVNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDN0IsUUFBMEIsRUFDMUIsYUFBbUM7UUFFbkMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEs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