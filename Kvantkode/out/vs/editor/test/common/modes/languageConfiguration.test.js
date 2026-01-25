/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { StandardAutoClosingPairConditional } from '../../../common/languages/languageConfiguration.js';
import { TestLanguageConfigurationService } from './testLanguageConfigurationService.js';
suite('StandardAutoClosingPairConditional', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Missing notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}' });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('Empty notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: [] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('Invalid notIn', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['bla'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in strings', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['string'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in comments', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['comment'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in regex', () => {
        const v = new StandardAutoClosingPairConditional({ open: '{', close: '}', notIn: ['regex'] });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in strings nor comments', () => {
        const v = new StandardAutoClosingPairConditional({
            open: '{',
            close: '}',
            notIn: ['string', 'comment'],
        });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), true);
    });
    test('notIn in strings nor regex', () => {
        const v = new StandardAutoClosingPairConditional({
            open: '{',
            close: '}',
            notIn: ['string', 'regex'],
        });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), true);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in comments nor regex', () => {
        const v = new StandardAutoClosingPairConditional({
            open: '{',
            close: '}',
            notIn: ['comment', 'regex'],
        });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), true);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('notIn in strings, comments nor regex', () => {
        const v = new StandardAutoClosingPairConditional({
            open: '{',
            close: '}',
            notIn: ['string', 'comment', 'regex'],
        });
        assert.strictEqual(v.isOK(0 /* StandardTokenType.Other */), true);
        assert.strictEqual(v.isOK(1 /* StandardTokenType.Comment */), false);
        assert.strictEqual(v.isOK(2 /* StandardTokenType.String */), false);
        assert.strictEqual(v.isOK(3 /* StandardTokenType.RegEx */), false);
    });
    test('language configurations priorities', () => {
        const languageConfigurationService = new TestLanguageConfigurationService();
        const id = 'testLang1';
        const d1 = languageConfigurationService.register(id, { comments: { lineComment: '1' } }, 100);
        const d2 = languageConfigurationService.register(id, { comments: { lineComment: '2' } }, 10);
        assert.strictEqual(languageConfigurationService.getLanguageConfiguration(id).comments?.lineCommentToken, '1');
        d1.dispose();
        d2.dispose();
        languageConfigurationService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9sYW5ndWFnZUNvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdkcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFeEYsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxHQUFHLElBQUksa0NBQWtDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksaUNBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxtQ0FBMkIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLGtDQUEwQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksaUNBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFF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