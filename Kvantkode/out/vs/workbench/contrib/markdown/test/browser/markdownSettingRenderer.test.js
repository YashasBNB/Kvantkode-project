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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Rvd24vdGVzdC9icm93c2VyL21hcmtkb3duU2V0dGluZ1JlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sVUFBVSxHQUdWLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFFeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR2hGLE1BQU0sYUFBYSxHQUF1QjtJQUN6QyxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxVQUFVO0lBQ2pCLElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsd0JBQXdCLEVBQUU7WUFDekIsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssd0NBQWdDO1NBQ3JDO1FBQ0QseUJBQXlCLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1NBQ3JDO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssd0NBQWdDO1NBQ3JDO1FBQ0QsdUJBQXVCLEVBQUU7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