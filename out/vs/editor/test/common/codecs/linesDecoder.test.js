/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../common/core/range.js';
import { Line } from '../../../common/codecs/linesCodec/tokens/line.js';
import { TestDecoder } from '../utils/testDecoder.js';
import { NewLine } from '../../../common/codecs/linesCodec/tokens/newLine.js';
import { newWriteableStream } from '../../../../base/common/stream.js';
import { CarriageReturn } from '../../../common/codecs/linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../../../common/codecs/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
/**
 * Note! This decoder is also often used to test common logic of abstract {@linkcode BaseDecoder}
 * class, because the {@linkcode LinesDecoder} is one of the simplest non-abstract decoders we have.
 */
suite('LinesDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Test the core logic with specific method of consuming
     * tokens that are produced by a lines decoder instance.
     */
    suite('core logic', () => {
        testLinesDecoder('async-generator', disposables);
        testLinesDecoder('consume-all-method', disposables);
        testLinesDecoder('on-data-event', disposables);
    });
    suite('settled promise', () => {
        test('throws if accessed on not-yet-started decoder instance', () => {
            const test = disposables.add(new TestLinesDecoder());
            assert.throws(() => {
                // testing the field access that throws here, so
                // its OK to not use the returned value afterwards
                // eslint-disable-next-line local/code-no-unused-expressions
                test.decoder.settled;
            }, ['Cannot get `settled` promise of a stream that has not been started.', 'Please call `start()` first.'].join(' '));
        });
    });
    suite('start', () => {
        test('throws if the decoder object is already `disposed`', () => {
            const test = disposables.add(new TestLinesDecoder());
            const { decoder } = test;
            decoder.dispose();
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already disposed.');
        });
        test('throws if the decoder object is already `ended`', async () => {
            const inputStream = newWriteableStream(null);
            const test = disposables.add(new TestLinesDecoder(inputStream));
            const { decoder } = test;
            setTimeout(() => {
                test.sendData(['hello', 'world :wave:']);
            }, 5);
            const receivedTokens = await decoder.start().consumeAll();
            // a basic sanity check for received tokens
            assert.strictEqual(receivedTokens.length, 3, 'Must produce the correct number of tokens.');
            // validate that calling `start()` after stream has ended throws
            assert.throws(decoder.start.bind(decoder), 'Cannot start stream that has already ended.');
        });
    });
});
/**
 * A reusable test utility that asserts that a `LinesDecoder` instance
 * correctly decodes `inputData` into a stream of `TLineToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = disposables.add(new TestLinesDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 *     new Line(1, ' hello world'),
 *     new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestLinesDecoder extends TestDecoder {
    constructor(inputStream) {
        const stream = inputStream ? inputStream : newWriteableStream(null);
        const decoder = new LinesDecoder(stream);
        super(stream, decoder);
    }
}
/**
 * Common reusable test utility to validate {@linkcode LinesDecoder} logic with
 * the provided {@linkcode tokensConsumeMethod} way of consuming decoder-produced tokens.
 *
 * @throws if a test fails, please see thrown error for failure details.
 * @param tokensConsumeMethod The way to consume tokens produced by the decoder.
 * @param disposables Test disposables store.
 */
function testLinesDecoder(tokensConsumeMethod, disposables) {
    suite(tokensConsumeMethod, () => {
        suite('produces expected tokens', () => {
            test('input starts with line data', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run(' hello world\nhow are you doing?\n\n 😊 \r ', [
                    new Line(1, ' hello world'),
                    new NewLine(new Range(1, 13, 1, 14)),
                    new Line(2, 'how are you doing?'),
                    new NewLine(new Range(2, 19, 2, 20)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ' 😊 '),
                    new CarriageReturn(new Range(4, 5, 4, 6)),
                    new Line(5, ' '),
                ]);
            });
            test('input starts with a new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\nsome text on this line\n\n\nanother 💬 on this line\r\n🤫\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, 'some text on this line'),
                    new NewLine(new Range(2, 23, 2, 24)),
                    new Line(3, ''),
                    new NewLine(new Range(3, 1, 3, 2)),
                    new Line(4, ''),
                    new NewLine(new Range(4, 1, 4, 2)),
                    new Line(5, 'another 💬 on this line'),
                    new CarriageReturn(new Range(5, 24, 5, 25)),
                    new NewLine(new Range(5, 25, 5, 26)),
                    new Line(6, '🤫'),
                    new NewLine(new Range(6, 3, 6, 4)),
                ]);
            });
            test('input starts and ends with multiple new lines', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run('\n\n\r\nciao! 🗯️\t💭 💥 come\tva?\n\n\n\n\n', [
                    new Line(1, ''),
                    new NewLine(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new NewLine(new Range(2, 1, 2, 2)),
                    new Line(3, ''),
                    new CarriageReturn(new Range(3, 1, 3, 2)),
                    new NewLine(new Range(3, 2, 3, 3)),
                    new Line(4, 'ciao! 🗯️\t💭 💥 come\tva?'),
                    new NewLine(new Range(4, 25, 4, 26)),
                    new Line(5, ''),
                    new NewLine(new Range(5, 1, 5, 2)),
                    new Line(6, ''),
                    new NewLine(new Range(6, 1, 6, 2)),
                    new Line(7, ''),
                    new NewLine(new Range(7, 1, 7, 2)),
                    new Line(8, ''),
                    new NewLine(new Range(8, 1, 8, 2)),
                ]);
            });
            test('single carriage return is treated as new line', async () => {
                const test = disposables.add(new TestLinesDecoder());
                await test.run("\r\rhaalo! 💥💥 how're you?\r ?!\r\n\r\n ", [
                    new Line(1, ''),
                    new CarriageReturn(new Range(1, 1, 1, 2)),
                    new Line(2, ''),
                    new CarriageReturn(new Range(2, 1, 2, 2)),
                    new Line(3, "haalo! 💥💥 how're you?"),
                    new CarriageReturn(new Range(3, 24, 3, 25)),
                    new Line(4, ' ?!'),
                    new CarriageReturn(new Range(4, 4, 4, 5)),
                    new NewLine(new Range(4, 5, 4, 6)),
                    new Line(5, ''),
                    new CarriageReturn(new Range(5, 1, 5, 2)),
                    new NewLine(new Range(5, 2, 5, 3)),
                    new Line(6, ' '),
                ]);
            });
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vY29kZWNzL2xpbmVzRGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQXdCLE1BQU0seUJBQXlCLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBbUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBYyxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GOzs7R0FHRztBQUNILEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0Q7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDaEQsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbkQsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQy9DLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLGlCQUFpQixFQUFF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