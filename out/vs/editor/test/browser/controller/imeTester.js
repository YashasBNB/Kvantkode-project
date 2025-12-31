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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lVGVzdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb250cm9sbGVyL2ltZVRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTdELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUVOLHlCQUF5QixHQUN6QixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQTtBQUM1RyxPQUFPLEVBRU4sYUFBYSxFQUNiLGVBQWUsR0FDZixNQUFNLDhFQUE4RSxDQUFBO0FBRXJGLHdDQUF3QztBQUV4QyxNQUFNLG1CQUFtQjtJQUd4QixZQUFZLElBQVk7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7SUFDbEIsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFZO1FBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO0lBQ2xCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxVQUFrQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FB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