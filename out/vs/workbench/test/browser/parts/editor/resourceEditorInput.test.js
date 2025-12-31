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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvcmVzb3VyY2VFZGl0b3JJbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDdEgsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIseUJBQXlCLEdBQ3pCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFaEcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJ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