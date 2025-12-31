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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvbGFuZ3VhZ2VDb25maWd1cmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXhGLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLENBQUMsR0FBRyxJQUFJLGtDQUFrQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLGlDQUF5QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksbUNBQTJCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxrQ0FBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLGlDQUF5QixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFH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