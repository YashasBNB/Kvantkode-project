/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../editor/common/core/range.js';
import { newWriteableStream } from '../../../../../../../base/common/stream.js';
import { TestDecoder } from '../../../../../../../editor/test/common/utils/testDecoder.js';
import { FileReference } from '../../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { MarkdownLink } from '../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { ChatPromptDecoder, } from '../../../../common/promptSyntax/codecs/chatPromptDecoder.js';
/**
 * A reusable test utility that asserts that a `ChatPromptDecoder` instance
 * correctly decodes `inputData` into a stream of `TChatPromptToken` tokens.
 *
 * ## Examples
 *
 * ```typescript
 * // create a new test utility instance
 * const test = testDisposables.add(new TestChatPromptDecoder());
 *
 * // run the test
 * await test.run(
 *   ' hello #file:./some-file.md world\n',
 *   [
 *     new FileReference(
 *       new Range(1, 8, 1, 28),
 *       './some-file.md',
 *     ),
 *   ]
 * );
 */
export class TestChatPromptDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new ChatPromptDecoder(stream);
        super(stream, decoder);
    }
}
suite('ChatPromptDecoder', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('• produces expected tokens', async () => {
        const test = testDisposables.add(new TestChatPromptDecoder());
        const contents = [
            '',
            'haalo!',
            ' message 👾 message #file:./path/to/file1.md',
            '',
            '## Heading Title',
            ' \t#file:a/b/c/filename2.md\t🖖\t#file:other-file.md',
            ' [#file:reference.md](./reference.md)some text #file:/some/file/with/absolute/path.md',
            'text text #file: another text',
        ];
        await test.run(contents, [
            new FileReference(new Range(3, 21, 3, 21 + 24), './path/to/file1.md'),
            new FileReference(new Range(6, 3, 6, 3 + 24), 'a/b/c/filename2.md'),
            new FileReference(new Range(6, 31, 6, 31 + 19), 'other-file.md'),
            new MarkdownLink(7, 2, '[#file:reference.md]', '(./reference.md)'),
            new FileReference(new Range(7, 48, 7, 48 + 38), '/some/file/with/absolute/path.md'),
            new FileReference(new Range(8, 11, 8, 11 + 6), ''),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9jaGF0UHJvbXB0RGVjb2Rlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzlGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUM3RyxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0sNkRBQTZELENBQUE7QUFFcEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFdBQWdEO0lBQzFGO1FBQ0MsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQVcsSUFBSSxDQUFDLENBQUE7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU3QyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsTUFBTSxlQUFlLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVqRSxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtRQUU3RCxNQUFNLFFBQVEsR0FBRztZQUNoQixFQUFFO1lBQ0YsUUFBUTtZQUNSLDhDQUE4QztZQUM5QyxFQUFFO1lBQ0Ysa0JBQWtCO1lBQ2xCLHNEQUFzRDtZQUN0RCx1RkFBdUY7WUFDdkYsK0JBQStCO1NBQy9CLENBQUE7UUFFRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO1lBQ3hCLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxvQkFBb0IsQ0FBQztZQUNyRSxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLENBQUM7WUFDbkUsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLGVBQWUsQ0FBQztZQUNoRSxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDO1lBQ2xFLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQztZQUNuRixJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ2xELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==