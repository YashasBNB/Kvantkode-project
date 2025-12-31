/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Extensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SimpleSettingRenderer } from '../../browser/markdownSettingRenderer.js';
const configuration = {
    id: 'examples',
    title: 'Examples',
    type: 'object',
    properties: {
        'example.booleanSetting': {
            type: 'boolean',
            default: false,
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        'example.booleanSetting2': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        'example.stringSetting': {
            type: 'string',
            default: 'one',
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        'example.numberSetting': {
            type: 'number',
            default: 3,
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
    },
};
class MarkdownConfigurationService extends TestConfigurationService {
    async updateValue(key, value) {
        const [section, setting] = key.split('.');
        return this.setUserConfiguration(section, { [setting]: value });
    }
}
suite('Markdown Setting Renderer Test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let preferencesService;
    let contextMenuService;
    let settingRenderer;
    suiteSetup(() => {
        configurationService = new MarkdownConfigurationService();
        preferencesService = {
            getSetting: (setting) => {
                let type = 'boolean';
                if (setting.includes('string')) {
                    type = 'string';
                }
                return { type, key: setting };
            },
        };
        contextMenuService = {};
        Registry.as(Extensions.Configuration).registerConfiguration(configuration);
        settingRenderer = new SimpleSettingRenderer(configurationService, contextMenuService, preferencesService, { publicLog2: () => { } }, { writeText: async () => { } });
    });
    suiteTeardown(() => {
        Registry.as(Extensions.Configuration).deregisterConfigurations([
            configuration,
        ]);
    });
    test('render code setting button with value', () => {
        const htmlRenderer = settingRenderer.getHtmlRenderer();
        const htmlNoValue = '<a href="code-oss://settings/example.booleanSetting" codesetting="true">';
        const renderedHtmlNoValue = htmlRenderer({
            block: false,
            raw: htmlNoValue,
            pre: false,
            text: '',
            type: 'html',
        });
        assert.strictEqual(renderedHtmlNoValue, `<code tabindex="0"><a href="code-setting://example.booleanSetting/true" class="codesetting" title="View or change setting" aria-role="button"><svg width="14" height="14" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 13.9l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2.1 4l2-2 2.1 1.4.4-2.4h2.8zm.6 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM8 9c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
			<span class="separator"></span>
			<span class="setting-name">example.booleanSetting</span>
		</a></code>`);
    });
    test('actions with no value', () => {
        const uri = URI.parse(settingRenderer.settingToUriString('example.booleanSetting'));
        const actions = settingRenderer.getActions(uri);
        assert.strictEqual(actions?.length, 2);
        assert.strictEqual(actions[0].label, 'View "Example: Boolean Setting" in Settings');
    });
    test('actions with value + updating and restoring', async () => {
        await configurationService.setUserConfiguration('example', { stringSetting: 'two' });
        const uri = URI.parse(settingRenderer.settingToUriString('example.stringSetting', 'three'));
        const verifyOriginalState = (actions) => {
            assert.strictEqual(actions?.length, 3);
            assert.strictEqual(actions[0].label, 'Set "Example: String Setting" to "three"');
            assert.strictEqual(actions[1].label, 'View in Settings');
            assert.strictEqual(configurationService.getValue('example.stringSetting'), 'two');
            return true;
        };
        const actions = settingRenderer.getActions(uri);
        if (verifyOriginalState(actions)) {
            // Update the value
            await actions[0].run();
            assert.strictEqual(configurationService.getValue('example.stringSetting'), 'three');
            const actionsUpdated = settingRenderer.getActions(uri);
            assert.strictEqual(actionsUpdated?.length, 3);
            assert.strictEqual(actionsUpdated[0].label, 'Restore value of "Example: String Setting"');
            assert.strictEqual(actions[1].label, 'View in Settings');
            assert.strictEqual(actions[2].label, 'Copy Setting ID');
            assert.strictEqual(configurationService.getValue('example.stringSetting'), 'three');
            // Restore the value
            await actionsUpdated[0].run();
            verifyOriginalState(settingRenderer.getActions(uri));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtkb3duL3Rlc3QvYnJvd3Nlci9tYXJrZG93blNldHRpbmdSZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUVOLFVBQVUsR0FHVixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdoRixNQUFNLGFBQWEsR0FBdUI7SUFDekMsRUFBRSxFQUFFLFVBQVU7SUFDZCxLQUFLLEVBQUUsVUFBVTtJQUNqQixJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLHdCQUF3QixFQUFFO1lBQ3pCLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLHdDQUFnQztTQUNyQztRQUNELHlCQUF5QixFQUFFO1lBQzFCLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLHdDQUFnQztTQUNyQztRQUNELHVCQUF1QixFQUFFO1lBQ3hCLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLHdDQUFnQztTQUNyQztRQUNELHVCQUF1QixFQUFFO1lBQ3hC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