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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlTW9kZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL3Rlc3QvYnJvd3Nlci9zZXR0aW5nc1RyZWVNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixVQUFVLEdBRVYsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtJQUMxQixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUQsUUFBUSxFQUFFLEtBQUs7WUFDZixLQUFLLEVBQUUsS0FBSztTQUNaLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDaEUsUUFBUSxFQUFFLFdBQVc7WUFDckIsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDeEUsUUFBUSxFQUFFLFNBQVM7WUFDbkIsS0FBSyxFQUFFLGVBQWU7U0FDdEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN4RCxRQUFRLEVBQUUsRUFBRTtZQUNaLEtBQUssRUFBRSxLQUFLO1NBQ1osQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVB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