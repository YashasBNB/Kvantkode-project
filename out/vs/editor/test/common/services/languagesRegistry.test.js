/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { LanguagesRegistry } from '../../../common/services/languagesRegistry.js';
suite('LanguagesRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('output language does not have a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'outputLangId',
                extensions: [],
                aliases: [],
                mimetypes: ['outputLanguageMimeType'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), []);
        registry.dispose();
    });
    test('language with alias does have a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: [],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'LangName', languageId: 'langId' },
        ]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'LangName');
        registry.dispose();
    });
    test('language without alias gets a name', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: [],
                mimetypes: ['bla'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'langId', languageId: 'langId' },
        ]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'langId');
        registry.dispose();
    });
    test('bug #4360: f# not shown in status bar', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: ['.ext1'],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            },
        ]);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: ['.ext2'],
                aliases: [],
                mimetypes: ['bla'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'LangName', languageId: 'langId' },
        ]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'LangName');
        registry.dispose();
    });
    test('issue #5278: Extension cannot override language name anymore', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: ['.ext1'],
                aliases: ['LangName'],
                mimetypes: ['bla'],
            },
        ]);
        registry._registerLanguages([
            {
                id: 'langId',
                extensions: ['.ext2'],
                aliases: ['BetterLanguageName'],
                mimetypes: ['bla'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'BetterLanguageName', languageId: 'langId' },
        ]);
        assert.deepStrictEqual(registry.getLanguageName('langId'), 'BetterLanguageName');
        registry.dispose();
    });
    test('mimetypes are generated if necessary', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
            },
        ]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/x-langId');
        registry.dispose();
    });
    test('first mimetype wins', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
                mimetypes: ['text/langId', 'text/langId2'],
            },
        ]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/langId');
        registry.dispose();
    });
    test('first mimetype wins 2', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'langId',
            },
        ]);
        registry._registerLanguages([
            {
                id: 'langId',
                mimetypes: ['text/langId'],
            },
        ]);
        assert.deepStrictEqual(registry.getMimeType('langId'), 'text/x-langId');
        registry.dispose();
    });
    test('aliases', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'a', languageId: 'a' },
        ]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        registry._registerLanguages([
            {
                id: 'a',
                aliases: ['A1', 'A2'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'A1', languageId: 'a' },
        ]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a1'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a2'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'A1');
        registry._registerLanguages([
            {
                id: 'a',
                aliases: ['A3', 'A4'],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'A3', languageId: 'a' },
        ]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a1'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a2'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a3'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a4'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'A3');
        registry.dispose();
    });
    test('empty aliases array means no alias', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'a', languageId: 'a' },
        ]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        registry._registerLanguages([
            {
                id: 'b',
                aliases: [],
            },
        ]);
        assert.deepStrictEqual(registry.getSortedRegisteredLanguageNames(), [
            { languageName: 'a', languageId: 'a' },
        ]);
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageIdByLanguageName('b'), 'b');
        assert.deepStrictEqual(registry.getLanguageName('a'), 'a');
        assert.deepStrictEqual(registry.getLanguageName('b'), null);
        registry.dispose();
    });
    test('extensions', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
                aliases: ['aName'],
                extensions: ['aExt'],
            },
        ]);
        assert.deepStrictEqual(registry.getExtensions('a'), ['aExt']);
        registry._registerLanguages([
            {
                id: 'a',
                extensions: ['aExt2'],
            },
        ]);
        assert.deepStrictEqual(registry.getExtensions('a'), ['aExt', 'aExt2']);
        registry.dispose();
    });
    test('extensions of primary language registration come first', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
                extensions: ['aExt3'],
            },
        ]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt3');
        registry._registerLanguages([
            {
                id: 'a',
                configuration: URI.file('conf.json'),
                extensions: ['aExt'],
            },
        ]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt');
        registry._registerLanguages([
            {
                id: 'a',
                extensions: ['aExt2'],
            },
        ]);
        assert.deepStrictEqual(registry.getExtensions('a')[0], 'aExt');
        registry.dispose();
    });
    test('filenames', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
                aliases: ['aName'],
                filenames: ['aFilename'],
            },
        ]);
        assert.deepStrictEqual(registry.getFilenames('a'), ['aFilename']);
        registry._registerLanguages([
            {
                id: 'a',
                filenames: ['aFilename2'],
            },
        ]);
        assert.deepStrictEqual(registry.getFilenames('a'), ['aFilename', 'aFilename2']);
        registry.dispose();
    });
    test('configuration', () => {
        const registry = new LanguagesRegistry(false);
        registry._registerLanguages([
            {
                id: 'a',
                aliases: ['aName'],
                configuration: URI.file('/path/to/aFilename'),
            },
        ]);
        assert.deepStrictEqual(registry.getConfigurationFiles('a'), [URI.file('/path/to/aFilename')]);
        assert.deepStrictEqual(registry.getConfigurationFiles('aname'), []);
        assert.deepStrictEqual(registry.getConfigurationFiles('aName'), []);
        registry._registerLanguages([
            {
                id: 'a',
                configuration: URI.file('/path/to/aFilename2'),
            },
        ]);
        assert.deepStrictEqual(registry.getConfigurationFiles('a'), [
            URI.file('/path/to/aFilename'),
            URI.file('/path/to/aFilename2'),
        ]);
        assert.deepStrictEqual(registry.getConfigurationFiles('aname'), []);
        assert.deepStrictEqual(registry.getConfigurationFiles('aName'), []);
        registry.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZXNSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFakYsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU3QyxRQUFRLENBQUMsa0JBQWtCLENBQUM7WUFDM0I7Z0JBQ0MsRUFBRSxFQUFFLGNBQWM7Z0JBQ2xCLFVBQVUsRUFBRSxFQUFFO2dCQUNkLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFNBQVMsRUFBRSxDQUFDLHdCQUF3QixDQUFDO2FBQ3JDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV2RSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFN0Ms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