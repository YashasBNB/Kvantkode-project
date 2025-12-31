/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { URI } from '../../../../base/common/uri.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MainThreadConfiguration } from '../../browser/mainThreadConfiguration.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { WorkspaceService } from '../../../services/configuration/browser/configurationService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadConfiguration', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const proxy = {
        $initializeConfiguration: () => { },
    };
    let instantiationService;
    let target;
    suiteSetup(() => {
        Registry.as(Extensions.Configuration).registerConfiguration({
            id: 'extHostConfiguration',
            title: 'a',
            type: 'object',
            properties: {
                'extHostConfiguration.resource': {
                    description: 'extHostConfiguration.resource',
                    type: 'boolean',
                    default: true,
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'extHostConfiguration.window': {
                    description: 'extHostConfiguration.resource',
                    type: 'boolean',
                    default: true,
                    scope: 4 /* ConfigurationScope.WINDOW */,
                },
            },
        });
    });
    setup(() => {
        target = sinon.spy();
        instantiationService = new TestInstantiationService();
        instantiationService.stub(IConfigurationService, WorkspaceService);
        instantiationService.stub(IConfigurationService, 'onDidUpdateConfiguration', sinon.mock());
        instantiationService.stub(IConfigurationService, 'onDidChangeConfiguration', sinon.mock());
        instantiationService.stub(IConfigurationService, 'updateValue', target);
        instantiationService.stub(IEnvironmentService, {
            isBuilt: false,
        });
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('update resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.window', 'value', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update resource configuration without configuration target defaults to folder', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(null, 'extHostConfiguration.resource', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
    test('update configuration with user configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(2 /* ConfigurationTarget.USER */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(2 /* ConfigurationTarget.USER */, target.args[0][3]);
    });
    test('update configuration with workspace configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(5 /* ConfigurationTarget.WORKSPACE */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('update configuration with folder configuration target', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$updateConfigurationOption(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, 'extHostConfiguration.window', 'value', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove resource configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in multi root workspace when no resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in multi root workspace when resource is provided', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in folder workspace when resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove window configuration without configuration target defaults to workspace in folder workspace when no resource is provider', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.window', undefined, undefined);
        assert.strictEqual(5 /* ConfigurationTarget.WORKSPACE */, target.args[0][3]);
    });
    test('remove configuration without configuration target defaults to folder', function () {
        instantiationService.stub(IWorkspaceContextService, {
            getWorkbenchState: () => 3 /* WorkbenchState.WORKSPACE */,
        });
        const testObject = instantiationService.createInstance(MainThreadConfiguration, SingleProxyRPCProtocol(proxy));
        testObject.$removeConfigurationOption(null, 'extHostConfiguration.resource', { resource: URI.file('abc') }, undefined);
        assert.strictEqual(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, target.args[0][3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRDb25maWd1cmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsR0FHVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLHlCQUF5QixFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxLQUFLLEdBQUc7UUFDYix3QkFBd0IsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO0tBQ2xD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