/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as strings from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createTextBufferFactory } from '../../../../common/model/textModel.js';
function testTextBufferFactory(text, eol, mightContainNonBasicASCII, mightContainRTL) {
    const { disposable, textBuffer } = createTextBufferFactory(text).create(1 /* DefaultEndOfLine.LF */);
    assert.strictEqual(textBuffer.mightContainNonBasicASCII(), mightContainNonBasicASCII);
    assert.strictEqual(textBuffer.mightContainRTL(), mightContainRTL);
    assert.strictEqual(textBuffer.getEOL(), eol);
    disposable.dispose();
}
suite('ModelBuilder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('t1', () => {
        testTextBufferFactory('', '\n', false, false);
    });
    test('t2', () => {
        testTextBufferFactory('Hello world', '\n', false, false);
    });
    test('t3', () => {
        testTextBufferFactory('Hello world\nHow are you?', '\n', false, false);
    });
    test('t4', () => {
        testTextBufferFactory('Hello world\nHow are you?\nIs everything good today?\nDo you enjoy the weather?', '\n', false, false);
    });
    test('carriage return detection (1 \\r\\n 2 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\nIs everything good today?\nDo you enjoy the weather?', '\n', false, false);
    });
    test('carriage return detection (2 \\r\\n 1 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\r\nIs everything good today?\nDo you enjoy the weather?', '\r\n', false, false);
    });
    test('carriage return detection (3 \\r\\n 0 \\n)', () => {
        testTextBufferFactory('Hello world\r\nHow are you?\r\nIs everything good today?\r\nDo you enjoy the weather?', '\r\n', false, false);
    });
    test('BOM handling', () => {
        testTextBufferFactory(strings.UTF8_BOM_CHARACTER + 'Hello world!', '\n', false, false);
    });
    test('RTL handling 2', () => {
        testTextBufferFactory('Hello world!זוהי עובדה מבוססת שדעתו', '\n', true, true);
    });
    test('RTL handling 3', () => {
        testTextBufferFactory('Hello world!זוהי \nעובדה מבוססת שדעתו', '\n', true, true);
    });
    test('ASCII handling 1', () => {
        testTextBufferFactory('Hello world!!\nHow do you do?', '\n', false, false);
    });
    test('ASCII handling 2', () => {
        testTextBufferFactory('Hello world!!\nHow do you do?Züricha📚📚b', '\n', true, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNUZXh0QnVmZmVyQnVpbGRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvbGluZXNUZXh0QnVmZmVyL2xpbmVzVGV4dEJ1ZmZlckJ1aWxkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLE9BQU8sTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRSxTQUFTLHFCQUFxQixDQUM3QixJQUFZLEVBQ1osR0FBVyxFQUNYLHlCQUFrQyxFQUNsQyxlQUF3QjtJQUV4QixNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sNkJBQXFCLENBQUE7SUFFNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO0lBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzVDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUNyQixDQUFDO0FBRUQsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDZixxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN2RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQ3BCLGlGQUFpRixFQUNqRixJQUFJLEVBQ0osS0FBSyxFQUNMLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELHFCQUFxQixDQUNwQixtRkFBbUYsRUFDbkYsSUFBSSxFQUNKLEtBQUssRUFDTCxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxxQkFBcUIsQ0FDcEIscUZBQXFGLEVBQ3JGLE1BQU0sRUFDTixLQUFLLEVBQ0wsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQscUJBQXFCLENBQ3BCLHVGQUF1RixFQUN2RixNQUFNLEVBQ04sS0FBSyxFQUNMLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixxQkFBcUIsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEdBQUcsY0FBYyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzNCLHFCQUFxQixDQUFDLHFDQUFxQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDL0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzNCLHFCQUFxQixDQUFDLHVDQUF1QyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLHFCQUFxQixDQUFDLCtCQUErQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDM0UsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLHFCQUFxQixDQUFDLDJDQUEyQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEYsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9