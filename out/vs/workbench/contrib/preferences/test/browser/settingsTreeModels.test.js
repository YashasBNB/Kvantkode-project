/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { settingKeyToDisplayFormat, parseQuery, } from '../../browser/settingsTreeModels.js';
suite('SettingsTree', () => {
    test('settingKeyToDisplayFormat', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar'), {
            category: 'Foo',
            label: 'Bar',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc'), {
            category: 'Foo › Bar',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etcSomething'), {
            category: 'Foo Bar',
            label: 'Etc Something',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo'), {
            category: '',
            label: 'Foo',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.1leading.number'), {
            category: 'Foo › 1leading',
            label: 'Number',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.1Leading.number'), {
            category: 'Foo › 1 Leading',
            label: 'Number',
        });
    });
    test('settingKeyToDisplayFormat - with category', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar', 'foo'), {
            category: '',
            label: 'Bar',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('disableligatures.ligatures', 'disableligatures'), {
            category: '',
            label: 'Ligatures',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'foo'), {
            category: 'Bar',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etcSomething', 'foo'), {
            category: 'Foo Bar',
            label: 'Etc Something',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'foo/bar'), {
            category: '',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('foo.bar.etc', 'something/foo'), {
            category: 'Bar',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('bar.etc', 'something.bar'), {
            category: '',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.etc', 'fooBar'), {
            category: '',
            label: 'Etc',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('fooBar.somethingElse.etc', 'fooBar'), {
            category: 'Something Else',
            label: 'Etc',
        });
    });
    test('settingKeyToDisplayFormat - known acronym/term', () => {
        assert.deepStrictEqual(settingKeyToDisplayFormat('css.someCssSetting'), {
            category: 'CSS',
            label: 'Some CSS Setting',
        });
        assert.deepStrictEqual(settingKeyToDisplayFormat('powershell.somePowerShellSetting'), {
            category: 'PowerShell',
            label: 'Some PowerShell Setting',
        });
    });
    test('parseQuery', () => {
        function testParseQuery(input, expected) {
            assert.deepStrictEqual(parseQuery(input), expected, input);
        }
        testParseQuery('', {
            tags: [],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@modified', {
            tags: ['modified'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@tag:foo', {
            tags: ['foo'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@modified foo', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'foo',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@tag:foo @modified', {
            tags: ['foo', 'modified'],
            extensionFilters: [],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@tag:foo @modified my query', {
            tags: ['foo', 'modified'],
            extensionFilters: [],
            query: 'my query',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('test @modified query', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'test  query',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('test @modified', {
            tags: ['modified'],
            extensionFilters: [],
            query: 'test',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('query has @ for some reason', {
            tags: [],
            extensionFilters: [],
            query: 'query has @ for some reason',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@ext:github.vscode-pull-request-github', {
            tags: [],
            extensionFilters: ['github.vscode-pull-request-github'],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@ext:github.vscode-pull-request-github,vscode.git', {
            tags: [],
            extensionFilters: ['github.vscode-pull-request-github', 'vscode.git'],
            query: '',
            featureFilters: [],
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@feature:scm', {
            tags: [],
            extensionFilters: [],
            featureFilters: ['scm'],
            query: '',
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@feature:scm,terminal', {
            tags: [],
            extensionFilters: [],
            featureFilters: ['scm', 'terminal'],
            query: '',
            idFilters: [],
            languageFilter: undefined,
        });
        testParseQuery('@id:files.autoSave', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: ['files.autoSave'],
            languageFilter: undefined,
        });
        testParseQuery('@id:files.autoSave,terminal.integrated.commandsToSkipShell', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: ['files.autoSave', 'terminal.integrated.commandsToSkipShell'],
            languageFilter: undefined,
        });
        testParseQuery('@lang:cpp', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: [],
            languageFilter: 'cpp',
        });
        testParseQuery('@lang:cpp,python', {
            tags: [],
            extensionFilters: [],
            featureFilters: [],
            query: '',
            idFilters: [],
            languageFilter: 'cpp',
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy90ZXN0L2Jyb3dzZXIvc2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsVUFBVSxHQUVWLE1BQU0scUNBQXFDLENBQUE7QUFFNUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVELFFBQVEsRUFBRSxLQUFLO1lBQ2YsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ2hFLFFBQVEsRUFBRSxXQUFXO1lBQ3JCLEtBQUssRUFBRSxLQUFLO1NBQ1osQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hFLFFBQVEsRUFBRSxTQUFTO1lBQ25CLEtBQUssRUFBRSxlQUFlO1NBQ3RCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDeEQsUUFBUSxFQUFFLEVBQUU7WUFDWixLQUFLLEVBQUUsS0FBSztTQUNaLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENB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