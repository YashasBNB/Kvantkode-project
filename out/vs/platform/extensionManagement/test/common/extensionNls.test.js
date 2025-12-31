/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { deepClone } from '../../../../base/common/objects.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { localizeManifest } from '../../common/extensionNls.js';
import { NullLogger } from '../../../log/common/log.js';
const manifest = {
    name: 'test',
    publisher: 'test',
    version: '1.0.0',
    engines: {
        vscode: '*',
    },
    contributes: {
        commands: [
            {
                command: 'test.command',
                title: '%test.command.title%',
                category: '%test.command.category%',
            },
        ],
        authentication: [
            {
                id: 'test.authentication',
                label: '%test.authentication.label%',
            },
        ],
        configuration: {
            // to ensure we test another "title" property
            title: '%test.configuration.title%',
            properties: {
                'test.configuration': {
                    type: 'string',
                    description: 'not important',
                },
            },
        },
    },
};
suite('Localize Manifest', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('replaces template strings', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Test Authentication');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Test Configuration');
    });
    test('replaces template strings with fallback if not found in translations', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {}, {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Test Authentication');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Test Configuration');
    });
    test('replaces template strings - command title & categories become ILocalizedString', function () {
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifest), {
            'test.command.title': 'Befehl test',
            'test.command.category': 'Testkategorie',
            'test.authentication.label': 'Testauthentifizierung',
            'test.configuration.title': 'Testkonfiguration',
        }, {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
            'test.authentication.label': 'Test Authentication',
            'test.configuration.title': 'Test Configuration',
        });
        const title = localizedManifest.contributes?.commands?.[0].title;
        const category = localizedManifest.contributes?.commands?.[0].category;
        assert.strictEqual(title.value, 'Befehl test');
        assert.strictEqual(title.original, 'Test Command');
        assert.strictEqual(category.value, 'Testkategorie');
        assert.strictEqual(category.original, 'Test Category');
        // Everything else stays as a string.
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, 'Testauthentifizierung');
        assert.strictEqual((localizedManifest.contributes?.configuration).title, 'Testkonfiguration');
    });
    test('replaces template strings - is best effort #164630', function () {
        const manifestWithTypo = {
            name: 'test',
            publisher: 'test',
            version: '1.0.0',
            engines: {
                vscode: '*',
            },
            contributes: {
                authentication: [
                    {
                        id: 'test.authentication',
                        // This not existing in the bundle shouldn't cause an error.
                        label: '%doesnotexist%',
                    },
                ],
                commands: [
                    {
                        command: 'test.command',
                        title: '%test.command.title%',
                        category: '%test.command.category%',
                    },
                ],
            },
        };
        const localizedManifest = localizeManifest(store.add(new NullLogger()), deepClone(manifestWithTypo), {
            'test.command.title': 'Test Command',
            'test.command.category': 'Test Category',
        });
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].title, 'Test Command');
        assert.strictEqual(localizedManifest.contributes?.commands?.[0].category, 'Test Category');
        assert.strictEqual(localizedManifest.contributes?.authentication?.[0].label, '%doesnotexist%');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2V4dGVuc2lvbk5scy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXZELE1BQU0sUUFBUSxHQUF1QjtJQUNwQyxJQUFJLEVBQUUsTUFBTTtJQUNaLFNBQVMsRUFBRSxNQUFNO0lBQ2pCLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLE9BQU8sRUFBRTtRQUNSLE1BQU0sRUFBRSxHQUFHO0tBQ1g7SUFDRCxXQUFXLEVBQUU7UUFDWixRQUFRLEVBQUU7WUFDVDtnQkFDQyxPQUFPLEVBQUUsY0FBYztnQkFDdkIsS0FBSyxFQUFFLHNCQUFzQjtnQkFDN0IsUUFBUSxFQUFFLHlCQUF5QjthQUNuQztTQUNEO1FBQ0QsY0FBYyxFQUFFO1lBQ2Y7Z0JBQ0MsRUFBRSxFQUFFLHFCQUFxQjtnQkFDekIsS0FBSyxFQUFFLDZCQUE2QjthQUNwQztTQUNEO1FBQ0QsYUFBYSxFQUFFO1lBQ2QsNkNBQTZDO1lBQzdDLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsVUFBVSxFQUFFO2dCQUNYLG9CQUFvQixFQUFFO29CQUNyQixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsZUFBZTtpQkFDNUI7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxD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