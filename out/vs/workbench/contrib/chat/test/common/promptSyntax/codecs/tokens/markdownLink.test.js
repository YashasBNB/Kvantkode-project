/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { randomInt } from '../../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
import { MarkdownLink } from '../../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { BaseToken } from '../../../../../../../../editor/common/codecs/baseToken.js';
import { MarkdownToken } from '../../../../../../../../editor/common/codecs/markdownCodec/tokens/markdownToken.js';
suite('FileReference', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('`linkRange`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const link = `(/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md)`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        const { linkRange } = markdownLink;
        assertDefined(linkRange, 'The link range must be defined.');
        const expectedLinkRange = new Range(lineNumber, 
        // `+1` for the openning `(` character of the link
        columnStartNumber + caption.length + 1, lineNumber, 
        // `+1` for the openning `(` character of the link, and
        // `-2` for the enclosing `()` part of the link
        columnStartNumber + caption.length + 1 + link.length - 2);
        assert(expectedLinkRange.equalsRange(linkRange), `Expected link range to be ${expectedLinkRange}, got ${linkRange}.`);
    });
    test('`path`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const rawLink = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md`;
        const link = `(${rawLink})`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        const { path } = markdownLink;
        assert.strictEqual(path, rawLink, 'Must return the correct link value.');
    });
    test('extends `MarkdownToken`', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const caption = `[link-caption-${randomInt(Number.MAX_SAFE_INTEGER)}]`;
        const rawLink = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.md`;
        const link = `(${rawLink})`;
        const markdownLink = new MarkdownLink(lineNumber, columnStartNumber, caption, link);
        assert(markdownLink instanceof MarkdownToken, 'Must extend `MarkdownToken`.');
        assert(markdownLink instanceof BaseToken, 'Must extend `BaseToken`.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL21hcmtkb3duTGluay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDaEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUVsSCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixTQUFTLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQTtRQUN0RSxNQUFNLElBQUksR0FBRyxvQkFBb0IsU0FBUyxDQUFDLE1BQU0sQ0FB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