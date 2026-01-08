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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvbWFya2Rvd25MaW5rLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9GQUFvRixDQUFBO0FBRWxILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLFNBQVMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFBO1FBQ3RFLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixTQUFTLENBQUMsTUFB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