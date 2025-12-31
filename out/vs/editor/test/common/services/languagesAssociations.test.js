/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getMimeTypes, registerPlatformLanguageAssociation, registerConfiguredLanguageAssociation, } from '../../../common/services/languagesAssociations.js';
suite('LanguagesAssociations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Dynamically Register Text Mime', () => {
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'codefile', filename: 'Codefile', mime: 'text/code' });
        guess = getMimeTypes(URI.file('Codefile'));
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.Codefile'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({
            id: 'docker',
            filepattern: 'Docker*',
            mime: 'text/docker',
        });
        guess = getMimeTypes(URI.file('Docker-debug'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        guess = getMimeTypes(URI.file('docker-PROD'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        registerPlatformLanguageAssociation({
            id: 'niceregex',
            mime: 'text/nice-regex',
            firstline: /RegexesAreNice/,
        });
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/nice-regex', 'text/plain']);
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNotNice');
        assert.deepStrictEqual(guess, ['application/unknown']);
        guess = getMimeTypes(URI.file('Codefile'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
    });
    test('Mimes Priority', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'foobar', mime: 'text/foobar', firstline: /foobar/ });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco'), 'foobar');
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({
            id: 'docker',
            filename: 'dockerfile',
            mime: 'text/winner',
        });
        registerPlatformLanguageAssociation({
            id: 'docker',
            filepattern: 'dockerfile*',
            mime: 'text/looser',
        });
        guess = getMimeTypes(URI.file('dockerfile'));
        assert.deepStrictEqual(guess, ['text/winner', 'text/plain']);
        registerPlatformLanguageAssociation({
            id: 'azure-looser',
            mime: 'text/azure-looser',
            firstline: /azure/,
        });
        registerPlatformLanguageAssociation({
            id: 'azure-winner',
            mime: 'text/azure-winner',
            firstline: /azure/,
        });
        guess = getMimeTypes(URI.file('azure'), 'azure');
        assert.deepStrictEqual(guess, ['text/azure-winner', 'text/plain']);
    });
    test('Specificity priority 1', () => {
        registerPlatformLanguageAssociation({
            id: 'monaco2',
            extension: '.monaco2',
            mime: 'text/monaco2',
        });
        registerPlatformLanguageAssociation({
            id: 'monaco2',
            filename: 'specific.monaco2',
            mime: 'text/specific-monaco2',
        });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco2')), [
            'text/specific-monaco2',
            'text/plain',
        ]);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco2')), ['text/monaco2', 'text/plain']);
    });
    test('Specificity priority 2', () => {
        registerPlatformLanguageAssociation({
            id: 'monaco3',
            filename: 'specific.monaco3',
            mime: 'text/specific-monaco3',
        });
        registerPlatformLanguageAssociation({
            id: 'monaco3',
            extension: '.monaco3',
            mime: 'text/monaco3',
        });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco3')), [
            'text/specific-monaco3',
            'text/plain',
        ]);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco3')), ['text/monaco3', 'text/plain']);
    });
    test('Mimes Priority - Longest Extension wins', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({
            id: 'monaco',
            extension: '.monaco.xml',
            mime: 'text/monaco-xml',
        });
        registerPlatformLanguageAssociation({
            id: 'monaco',
            extension: '.monaco.xml.build',
            mime: 'text/monaco-xml-build',
        });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco-xml', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml.build'));
        assert.deepStrictEqual(guess, ['text/monaco-xml-build', 'text/plain']);
    });
    test('Mimes Priority - User configured wins', () => {
        registerConfiguredLanguageAssociation({
            id: 'monaco',
            extension: '.monaco.xnl',
            mime: 'text/monaco',
        });
        registerPlatformLanguageAssociation({
            id: 'monaco',
            extension: '.monaco.xml',
            mime: 'text/monaco-xml',
        });
        const guess = getMimeTypes(URI.file('foo.monaco.xnl'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Pattern matches on path if specified', () => {
        registerPlatformLanguageAssociation({
            id: 'monaco',
            filepattern: '**/dot.monaco.xml',
            mime: 'text/monaco',
        });
        registerPlatformLanguageAssociation({
            id: 'other',
            filepattern: '*ot.other.xml',
            mime: 'text/other',
        });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Last registered mime wins', () => {
        registerPlatformLanguageAssociation({
            id: 'monaco',
            filepattern: '**/dot.monaco.xml',
            mime: 'text/monaco',
        });
        registerPlatformLanguageAssociation({
            id: 'other',
            filepattern: '**/dot.monaco.xml',
            mime: 'text/other',
        });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/other', 'text/plain']);
    });
    test('Data URIs', () => {
        registerPlatformLanguageAssociation({ id: 'data', extension: '.data', mime: 'text/data' });
        assert.deepStrictEqual(getMimeTypes(URI.parse(`data:;label:something.data;description:data,`)), ['text/data', 'text/plain']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sWUFBWSxFQUNaLG1DQUFtQyxFQUNuQyxxQ0FBcUMsR0FDckMsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxJQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBRXRELG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ2hHLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFNUQsS0FBSyxHQUFHLFlBQVksQ0FB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