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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vZXh0ZW5zaW9uTmxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUcvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFdkQsTUFBTSxRQUFRLEdBQXVCO0lBQ3BDLElBQUksRUFBRSxNQUFNO0lBQ1osU0FBUyxFQUFFLE1BQU07SUFDakIsT0FBTyxFQUFFLE9BQU87SUFDaEIsT0FBTyxFQUFFO1FBQ1IsTUFBTSxFQUFFLEdBQUc7S0FDWDtJQUNELFdBQVcsRUFBRTtRQUNaLFFBQVEsRUFBRTtZQUNUO2dCQUNDLE9BQU8sRUFBRSxjQUFjO2dCQUN2QixLQUFLLEVBQUUsc0JBQXNCO2dCQUM3QixRQUFRLEVBQUUseUJBQXlCO2FBQ25DO1NBQ0Q7UUFDRCxjQUFjLEVBQUU7WUFDZjtnQkFDQyxFQUFFLEVBQUUscUJBQXFCO2dCQUN6QixLQUFLLEVBQUUsNkJBQTZCO2FBQ3BDO1NBQ0Q7UUFDRCxhQUFhLEVBQUU7WUFDZCw2Q0FBNkM7WUFDN0MsS0FBSyxFQUFFLDRCQUE0QjtZQUNuQyxVQUFVLEVBQUU7Z0JBQ1gsb0JBQW9CLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxlQUFlO2lCQUM1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