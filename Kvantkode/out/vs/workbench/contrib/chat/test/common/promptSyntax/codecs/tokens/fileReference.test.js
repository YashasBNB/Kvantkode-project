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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL2ZpbGVSZWZlcmVuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDakcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0csT0FBTyxFQUNOLGNBQWMsRUFDZCxzQkFBc0IsR0FDdEIsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sSUFBSSxHQUFHLG1CQUFtQixTQUFTLENB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