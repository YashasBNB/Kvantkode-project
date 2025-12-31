/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { randomInt } from '../../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { BaseToken } from '../../../../../../../../editor/common/codecs/baseToken.js';
import { PromptToken } from '../../../../../common/promptSyntax/codecs/tokens/promptToken.js';
import { FileReference } from '../../../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
import { PromptVariable, PromptVariableWithData, } from '../../../../../common/promptSyntax/codecs/tokens/promptVariable.js';
suite('FileReference', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('• linkRange', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const path = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + path.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, path);
        const { linkRange } = fileReference;
        assertDefined(linkRange, 'The link range must be defined.');
        const expectedLinkRange = new Range(lineNumber, columnStartNumber + '#file:'.length, lineNumber, columnStartNumber + path.length);
        assert(expectedLinkRange.equalsRange(linkRange), `Expected link range to be ${expectedLinkRange}, got ${linkRange}.`);
    });
    test('• path', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const link = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + link.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, link);
        assert.strictEqual(fileReference.path, link, 'Must return the correct link path.');
    });
    test('• extends `PromptVariableWithData` and others', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const link = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + link.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, link);
        assert(fileReference instanceof PromptVariableWithData, 'Must extend `PromptVariableWithData`.');
        assert(fileReference instanceof PromptVariable, 'Must extend `PromptVariable`.');
        assert(fileReference instanceof PromptToken, 'Must extend `PromptToken`.');
        assert(fileReference instanceof BaseToken, 'Must extend `BaseToken`.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9maWxlUmVmZXJlbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsc0JBQXNCLEdBQ3RCLE1BQU0sb0VBQW9FLENBQUE7QUFFM0UsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLElBQUksR0FBRyxtQkFBbUIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FB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