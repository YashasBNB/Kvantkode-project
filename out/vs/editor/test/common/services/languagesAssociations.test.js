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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZXNBc3NvY2lhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTixZQUFZLEVBQ1osbUNBQW1DLEVBQ25DLHFDQUFxQyxHQUNyQyxNQUFNLG1EQUFtRCxDQUFBO0FBRTFELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzNDLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFFdEQsbUNBQW1DLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDaEcsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRTVELG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ2hHLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFMUQsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFFdEQsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFFBQVE7WUFDWixXQUFXLEVBQUUsU0FBUztZQUN0QixJQUFJLEVBQUUsYUFBYTtTQUNuQixDQUFDLENBQUE7UUFDRixLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRTVELEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFNUQsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFdBQVc7WUFDZixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFNBQVMsRUFBRSxnQkFBZ0I7U0FDM0IsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFaEUsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUV0RCxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUNoRyxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUUvRixJQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFNUQsS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFNUQsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFFBQVE7WUFDWixRQUFRLEVBQUUsWUFBWTtZQUN0QixJQUFJLEVBQUUsYUFBYTtTQUNuQixDQUFDLENBQUE7UUFDRixtQ0FBbUMsQ0FBQztZQUNuQyxFQUFFLEVBQUUsUUFBUTtZQUNaLFdBQVcsRUFBRSxhQUFhO1lBQzFCLElBQUksRUFBRSxhQUFhO1NBQ25CLENBQUMsQ0FBQTtRQUNGLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFNUQsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLGNBQWM7WUFDbEIsSUFBSSxFQUFFLG1CQUFtQjtZQUN6QixTQUFTLEVBQUUsT0FBTztTQUNsQixDQUFDLENBQUE7UUFDRixtQ0FBbUMsQ0FBQztZQUNuQyxFQUFFLEVBQUUsY0FBYztZQUNsQixJQUFJLEVBQUUsbUJBQW1CO1lBQ3pCLFNBQVMsRUFBRSxPQUFPO1NBQ2xCLENBQUMsQ0FBQTtRQUNGLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLG1DQUFtQyxDQUFDO1lBQ25DLEVBQUUsRUFBRSxTQUFTO1lBQ2IsU0FBUyxFQUFFLFVBQVU7WUFDckIsSUFBSSxFQUFFLGNBQWM7U0FDcEIsQ0FBQyxDQUFBO1FBQ0YsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFNBQVM7WUFDYixRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSx1QkFBdUI7U0FDN0IsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUU7WUFDbEUsdUJBQXVCO1lBQ3ZCLFlBQVk7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtJQUM5RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFNBQVM7WUFDYixRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLElBQUksRUFBRSx1QkFBdUI7U0FDN0IsQ0FBQyxDQUFBO1FBQ0YsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFNBQVM7WUFDYixTQUFTLEVBQUUsVUFBVTtZQUNyQixJQUFJLEVBQUUsY0FBYztTQUNwQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRTtZQUNsRSx1QkFBdUI7WUFDdkIsWUFBWTtTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQzlGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUNoRyxtQ0FBbUMsQ0FBQztZQUNuQyxFQUFFLEVBQUUsUUFBUTtZQUNaLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLElBQUksRUFBRSxpQkFBaUI7U0FDdkIsQ0FBQyxDQUFBO1FBQ0YsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFFBQVE7WUFDWixTQUFTLEVBQUUsbUJBQW1CO1lBQzlCLElBQUksRUFBRSx1QkFBdUI7U0FDN0IsQ0FBQyxDQUFBO1FBRUYsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRTVELEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRWhFLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQ3ZFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxxQ0FBcUMsQ0FBQztZQUNyQyxFQUFFLEVBQUUsUUFBUTtZQUNaLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLElBQUksRUFBRSxhQUFhO1NBQ25CLENBQUMsQ0FBQTtRQUNGLG1DQUFtQyxDQUFDO1lBQ25DLEVBQUUsRUFBRSxRQUFRO1lBQ1osU0FBUyxFQUFFLGFBQWE7WUFDeEIsSUFBSSxFQUFFLGlCQUFpQjtTQUN2QixDQUFDLENBQUE7UUFFRixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7UUFDbEUsbUNBQW1DLENBQUM7WUFDbkMsRUFBRSxFQUFFLFFBQVE7WUFDWixXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLElBQUksRUFBRSxhQUFhO1NBQ25CLENBQUMsQ0FBQTtRQUNGLG1DQUFtQyxDQUFDO1lBQ25DLEVBQUUsRUFBRSxPQUFPO1lBQ1gsV0FBVyxFQUFFLGVBQWU7WUFDNUIsSUFBSSxFQUFFLFlBQVk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELG1DQUFtQyxDQUFDO1lBQ25DLEVBQUUsRUFBRSxRQUFRO1lBQ1osV0FBVyxFQUFFLG1CQUFtQjtZQUNoQyxJQUFJLEVBQUUsYUFBYTtTQUNuQixDQUFDLENBQUE7UUFDRixtQ0FBbUMsQ0FBQztZQUNuQyxFQUFFLEVBQUUsT0FBTztZQUNYLFdBQVcsRUFBRSxtQkFBbUI7WUFDaEMsSUFBSSxFQUFFLFlBQVk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUUxRixNQUFNLENBQUMsZUFBZSxDQUNyQixZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLEVBQ3ZFLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUMzQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9