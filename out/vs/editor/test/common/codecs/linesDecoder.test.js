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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9jb2RlY3MvbGluZXNEZWNvZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBd0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFtQixNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFjLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0Y7OztHQUdHO0FBQ0gsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RDs7O09BR0c7SUFDSCxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN4QixnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNoRCxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNuRCxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsaUJBQWlC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TSxJQUFJLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxFQUFFO29CQUM5RCxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN6QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLDRCQUE0QixDQUFDO29CQUN6QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDbEMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hFLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7Z0JBRXBELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsRUFBRTtvQkFDM0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDZixJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDekMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDO29CQUN0QyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDM0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQztvQkFDbEIsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNmLElBQUksY0FBYyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN6QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztpQkFDaEIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9