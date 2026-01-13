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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHREZWNvZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDOUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQzdHLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSw2REFBNkQsQ0FBQTtBQUVwRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsV0FBZ0Q7SUFDMUY7UUFDQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTdDLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRWpFLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFBO1FBRTdELE1BQU0sUUFBUSxHQUFHO1lBQ2hCLEVBQUU7WUFDRixRQUFRO1lBQ1IsOENBQThDO1lBQzlDLEVBQUU7WUFDRixrQkFBa0I7WUFDbEIsc0RBQXNEO1lBQ3RELHVGQUF1RjtZQUN2RiwrQkFBK0I7U0FDL0IsQ0FBQTtRQUVELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7WUFDeEIsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLG9CQUFvQixDQUFDO1lBQ3JFLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxvQkFBb0IsQ0FBQztZQUNuRSxJQUFJLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDO1lBQ2hFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLENBQUM7WUFDbEUsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLGtDQUFrQyxDQUFDO1lBQ25GLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDbEQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9