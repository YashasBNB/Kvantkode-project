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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlc1JlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVqRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTdDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztZQUMzQjtnQkFDQyxFQUFFLEVBQUUsY0FBYztnQkFDbEIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsU0FBUyxFQUFFLENBQUMsd0JBQXdCLENBQUM7YUFDckM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXZFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsQ0FB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