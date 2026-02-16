/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';
import { AbstractResourceEditorInput } from '../../../../common/editor/resourceEditorInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { CustomEditorLabelService, ICustomEditorLabelService, } from '../../../../services/editor/common/customEditorLabelService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
suite('ResourceEditorInput', () => {
    const disposables = new DisposableStore();
    let TestResourceEditorInput = class TestResourceEditorInput extends AbstractResourceEditorInput {
        constructor(resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
            super(resource, resource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
            this.typeId = 'test.typeId';
        }
    };
    TestResourceEditorInput = __decorate([
        __param(1, ILabelService),
        __param(2, IFileService),
        __param(3, IFilesConfigurationService),
        __param(4, ITextResourceConfigurationService),
        __param(5, ICustomEditorLabelService)
    ], TestResourceEditorInput);
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const testConfigurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, testConfigurationService);
        const customEditorLabelService = disposables.add(new CustomEditorLabelService(testConfigurationService, instantiationService.get(IWorkspaceContextService)));
        instantiationService.stub(ICustomEditorLabelService, customEditorLabelService);
        return [instantiationService, testConfigurationService, customEditorLabelService];
    }
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const [instantiationService] = await createServices();
        const resource = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const input = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource));
        assert.ok(input.getName().length > 0);
        assert.ok(input.getDescription(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getDescription(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getDescription(2 /* Verbosity.LONG */).length > 0);
        assert.ok(input.getTitle(0 /* Verbosity.SHORT */).length > 0);
        assert.ok(input.getTitle(1 /* Verbosity.MEDIUM */).length > 0);
        assert.ok(input.getTitle(2 /* Verbosity.LONG */).length > 0);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        assert.strictEqual(input.hasCapability(4 /* EditorInputCapabilities.Untitled */), true);
    });
    test('custom editor name', async () => {
        const [instantiationService, testConfigurationService, customEditorLabelService] = await createServices();
        const resource1 = URI.from({ scheme: 'testResource', path: 'thePath/of/the/resource.txt' });
        const resource2 = URI.from({ scheme: 'testResource', path: 'theOtherPath/of/the/resource.md' });
        const input1 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource1));
        const input2 = disposables.add(instantiationService.createInstance(TestResourceEditorInput, resource2));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            '**/theOtherPath/**': 'Label 1',
            '**/*.txt': 'Label 2',
            '**/resource.txt': 'Label 3',
        });
        testConfigurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration(configuration) {
                return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS;
            },
            source: 2 /* ConfigurationTarget.USER */,
        });
        let label1Name = '';
        let label2Name = '';
        disposables.add(customEditorLabelService.onDidChange(() => {
            label1Name = input1.getName();
            label2Name = input2.getName();
        }));
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration(configuration) {
                return configuration === CustomEditorLabelService.SETTING_ID_ENABLED;
            },
            source: 2 /* ConfigurationTarget.USER */,
        });
        assert.ok(label1Name === 'Label 3');
        assert.ok(label2Name === 'Label 1');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, false);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration(configuration) {
                return configuration === CustomEditorLabelService.SETTING_ID_ENABLED;
            },
            source: 2 /* ConfigurationTarget.USER */,
        });
        assert.ok(label1Name === 'resource.txt');
        assert.ok(label2Name === 'resource.md');
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_ENABLED, true);
        testConfigurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration(configuration) {
                return configuration === CustomEditorLabelService.SETTING_ID_ENABLED;
            },
            source: 2 /* ConfigurationTarget.USER */,
        });
        await testConfigurationService.setUserConfiguration(CustomEditorLabelService.SETTING_ID_PATTERNS, {
            'thePath/**/resource.txt': 'Label 4',
            'thePath/of/*/resource.txt': 'Label 5',
        });
        testConfigurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration(configuration) {
                return configuration === CustomEditorLabelService.SETTING_ID_PATTERNS;
            },
            source: 2 /* ConfigurationTarget.USER */,
        });
        assert.ok(label1Name === 'Label 5');
        assert.ok(label2Name === 'resource.md');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9yZXNvdXJjZUVkaXRvcklucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUN0SCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FDekIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRyxLQUFLLENBQUMs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