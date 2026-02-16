/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { renderFormattedText, renderText } from '../../browser/formattedTextRenderer.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('FormattedTextRenderer', () => {
    const store = new DisposableStore();
    setup(() => {
        store.clear();
    });
    teardown(() => {
        store.clear();
    });
    test('render simple element', () => {
        const result = renderText('testing');
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result.textContent, 'testing');
        assert.strictEqual(result.tagName, 'DIV');
    });
    test('render element with class', () => {
        const result = renderText('testing', {
            className: 'testClass',
        });
        assert.strictEqual(result.nodeType, document.ELEMENT_NODE);
        assert.strictEqual(result.className, 'testClass');
    });
    test('simple formatting', () => {
        let result = renderFormattedText('**bold**');
        assert.strictEqual(result.children.length, 1);
        assert.strictEqual(result.firstChild.textContent, 'bold');
        assert.strictEqual(result.firstChild.tagName, 'B');
        assert.strictEqual(result.innerHTML, '<b>bold</b>');
        result = renderFormattedText('__italics__');
        assert.strictEqual(result.innerHTML, '<i>italics</i>');
        result = renderFormattedText('``code``');
        assert.strictEqual(result.innerHTML, '``code``');
        result = renderFormattedText('``code``', { renderCodeSegments: true });
        assert.strictEqual(result.innerHTML, '<code>code</code>');
        result = renderFormattedText('this string has **bold**, __italics__, and ``code``!!', {
            renderCodeSegments: true,
        });
        assert.strictEqual(result.innerHTML, 'this string has <b>bold</b>, <i>italics</i>, and <code>code</code>!!');
    });
    test('no formatting', () => {
        const result = renderFormattedText('this is just a string');
        assert.strictEqual(result.innerHTML, 'this is just a string');
    });
    test('preserve newlines', () => {
        const result = renderFormattedText('line one\nline two');
        assert.strictEqual(result.innerHTML, 'line one<br>line two');
    });
    test('action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('[[action]]', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store,
            },
        });
        assert.strictEqual(result.innerHTML, '<a>action</a>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancy action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('__**[[action]]**__', {
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store,
            },
        });
        assert.strictEqual(result.innerHTML, '<i><b><a>action</a></b></i>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('fancier action', () => {
        let callbackCalled = false;
        const result = renderFormattedText('``__**[[action]]**__``', {
            renderCodeSegments: true,
            actionHandler: {
                callback(content) {
                    assert.strictEqual(content, '0');
                    callbackCalled = true;
                },
                disposables: store,
            },
        });
        assert.strictEqual(result.innerHTML, '<code><i><b><a>action</a></b></i></code>');
        const event = document.createEvent('MouseEvent');
        event.initEvent('click', true, true);
        result.firstChild.firstChild.firstChild.firstChild.dispatchEvent(event);
        assert.strictEqual(callbackCalled, true);
    });
    test('escaped formatting', () => {
        const result = renderFormattedText('\\*\\*bold\\*\\*');
        assert.strictEqual(result.children.length, 0);
        assert.strictEqual(result.innerHTML, '**bold**');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGVkVGV4dFJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL2Zvcm1hdHRlZFRleHRSZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUVuQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2QsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ2QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sTUFBTSxHQUFnQixVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxF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