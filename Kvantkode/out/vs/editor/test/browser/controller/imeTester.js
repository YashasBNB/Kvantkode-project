/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as dom from '../../../../base/browser/dom.js';
import * as browser from '../../../../base/browser/browser.js';
import * as platform from '../../../../base/common/platform.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { TestAccessibilityService } from '../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { PagedScreenReaderStrategy, } from '../../../browser/controller/editContext/screenReaderUtils.js';
import { TextAreaState } from '../../../browser/controller/editContext/textArea/textAreaEditContextState.js';
import { TextAreaInput, TextAreaWrapper, } from '../../../browser/controller/editContext/textArea/textAreaEditContextInput.js';
// To run this test, open imeTester.html
class SingleLineTestModel {
    constructor(line) {
        this._line = line;
    }
    _setText(text) {
        this._line = text;
    }
    getLineMaxColumn(lineNumber) {
        return this._line.length + 1;
    }
    getValueInRange(range, eol) {
        return this._line.substring(range.startColumn - 1, range.endColumn - 1);
    }
    getValueLengthInRange(range, eol) {
        return this.getValueInRange(range, eol).length;
    }
    modifyPosition(position, offset) {
        const column = Math.min(this.getLineMaxColumn(position.lineNumber), Math.max(1, position.column + offset));
        return new Position(position.lineNumber, column);
    }
    getModelLineContent(lineNumber) {
        return this._line;
    }
    getLineCount() {
        return 1;
    }
}
class TestView {
    constructor(model) {
        this._model = model;
    }
    paint(output) {
        dom.clearNode(output);
        for (let i = 1; i <= this._model.getLineCount(); i++) {
            const textNode = document.createTextNode(this._model.getModelLineContent(i));
            output.appendChild(textNode);
            const br = document.createElement('br');
            output.appendChild(br);
        }
    }
}
function doCreateTest(description, inputStr, expectedStr) {
    let cursorOffset = 0;
    let cursorLength = 0;
    const container = document.createElement('div');
    container.className = 'container';
    const title = document.createElement('div');
    title.className = 'title';
    const inputStrStrong = document.createElement('strong');
    inputStrStrong.innerText = inputStr;
    title.innerText = description + '. Type ';
    title.appendChild(inputStrStrong);
    container.appendChild(title);
    const startBtn = document.createElement('button');
    startBtn.innerText = 'Start';
    container.appendChild(startBtn);
    const input = document.createElement('textarea');
    input.setAttribute('rows', '10');
    input.setAttribute('cols', '40');
    container.appendChild(input);
    const model = new SingleLineTestModel('some  text');
    const textAreaInputHost = {
        getDataToCopy: () => {
            return {
                isFromEmptySelection: false,
                multicursorText: null,
                text: '',
                html: undefined,
                mode: null,
            };
        },
        getScreenReaderContent: () => {
            const selection = new Range(1, 1 + cursorOffset, 1, 1 + cursorOffset + cursorLength);
            const screenReaderContentState = PagedScreenReaderStrategy.fromEditorSelection(model, selection, 10, true);
            return TextAreaState.fromScreenReaderContentState(screenReaderContentState);
        },
        deduceModelPosition: (viewAnchorPosition, deltaOffset, lineFeedCnt) => {
            return null;
        },
    };
    const handler = new TextAreaInput(textAreaInputHost, new TextAreaWrapper(input), platform.OS, {
        isAndroid: browser.isAndroid,
        isFirefox: browser.isFirefox,
        isChrome: browser.isChrome,
        isSafari: browser.isSafari,
    }, new TestAccessibilityService(), new NullLogService());
    const output = document.createElement('pre');
    output.className = 'output';
    container.appendChild(output);
    const check = document.createElement('pre');
    check.className = 'check';
    container.appendChild(check);
    const br = document.createElement('br');
    br.style.clear = 'both';
    container.appendChild(br);
    const view = new TestView(model);
    const updatePosition = (off, len) => {
        cursorOffset = off;
        cursorLength = len;
        handler.writeNativeTextAreaContent('selection changed');
        handler.focusTextArea();
    };
    const updateModelAndPosition = (text, off, len) => {
        model._setText(text);
        updatePosition(off, len);
        view.paint(output);
        const expected = 'some ' + expectedStr + ' text';
        if (text === expected) {
            check.innerText = '[GOOD]';
            check.className = 'check good';
        }
        else {
            check.innerText = '[BAD]';
            check.className = 'check bad';
        }
        check.appendChild(document.createTextNode(expected));
    };
    handler.onType((e) => {
        console.log('type text: ' + e.text + ', replaceCharCnt: ' + e.replacePrevCharCnt);
        const text = model.getModelLineContent(1);
        const preText = text.substring(0, cursorOffset - e.replacePrevCharCnt);
        const postText = text.substring(cursorOffset + cursorLength);
        const midText = e.text;
        updateModelAndPosition(preText + midText + postText, (preText + midText).length, 0);
    });
    view.paint(output);
    startBtn.onclick = function () {
        updateModelAndPosition('some  text', 5, 0);
        input.focus();
    };
    return container;
}
const TESTS = [
    { description: 'Japanese IME 1', in: 'sennsei [Enter]', out: 'せんせい' },
    { description: 'Japanese IME 2', in: 'konnichiha [Enter]', out: 'こんいちは' },
    { description: 'Japanese IME 3', in: 'mikann [Enter]', out: 'みかん' },
    { description: 'Korean IME 1', in: 'gksrmf [Space]', out: '한글 ' },
    { description: 'Chinese IME 1', in: '.,', out: '。，' },
    { description: 'Chinese IME 2', in: 'ni [Space] hao [Space]', out: '你好' },
    { description: 'Chinese IME 3', in: 'hazni [Space]', out: '哈祝你' },
    { description: 'Mac dead key 1', in: '`.', out: '`.' },
    { description: 'Mac hold key 1', in: 'e long press and 1', out: 'é' },
];
TESTS.forEach((t) => {
    mainWindow.document.body.appendChild(doCreateTest(t.description, t.in, t.out));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lVGVzdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvaW1lVGVzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQzVHLE9BQU8sRUFFTixhQUFhLEVBQ2IsZUFBZSxHQUNmLE1BQU0sOEVBQThFLENBQUE7QUFFckYsd0NBQXdDO0FBRXhDLE1BQU0sbUJBQW1CO0lBR3hCLFlBQVksSUFBWTtRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNsQixDQUFDO0lBRUQsUUFBUSxDQUFDLElBQVk7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7SUFDbEIsQ0FBQztJQUVELGdCQUFnQixDQUFDLFVBQWtCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEtBQUss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