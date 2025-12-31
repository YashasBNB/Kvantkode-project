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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNUZXh0QnVmZmVyQnVpbGRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2xpbmVzVGV4dEJ1ZmZlci9saW5lc1RleHRCdWZmZXJCdWlsZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0UsU0FBUyxxQkFBcUIsQ0FDN0IsSUFBWSxFQUNaLEdBQVcsRUFDWCx5QkFBa0MsRUFDbEMsZUFBd0I7SUFFeEIsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLDZCQUFxQixDQUFBO0lBRTVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLHlCQUF5QixFQUFFLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtJQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUM1QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7QUFDckIsQ0FBQztBQUVELEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDZixxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDekQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUNwQixpRkFBaUYsRUFDakYsSUFBSSxFQUNKLEtBQUssRUFDTCxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxxQkFBcUIsQ0FDcEIsbUZBQW1GLEVBQ25GLElBQUksRUFDSixLQUFLLEVBQ0wsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQscUJBQXFCLENBQ3BCLHFGQUFxRixFQUNyRixNQUFNLEVBQ04sS0FBSyxFQUNMLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELHFCQUFxQixDQUNwQix1RkFBdUYsRUFDdkYsTUFBTSxFQUNOLEtBQUssRUFDTCxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIscUJBQXFCLENBQUMsT0FBTyxDQUFDLGtCQUFrQixHQUFHLGNBQWMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixxQkFBcUIsQ0FBQyxxQ0FBcUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixxQkFBcUIsQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2pGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixxQkFBcUIsQ0FBQywrQkFBK0IsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNFLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixxQkFBcUIsQ0FBQywyQ0FBMkMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==