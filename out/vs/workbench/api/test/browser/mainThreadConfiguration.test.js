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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZENvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxHQUdWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMseUJBQXlCLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLEtBQUssR0FBRztRQUNiLHdCQUF3QixFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7S0FDbEMsQ0FBQTtJQUNELElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxNQUFzQixDQUFBO0lBRTFCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7WUFDbkYsRUFBRSxFQUFFLHNCQUFzQjtZQUMxQixLQUFLLEVBQUUsR0FBRztZQUNWLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLCtCQUErQixFQUFFO29CQUNoQyxXQUFXLEVBQUUsK0JBQStCO29CQUM1QyxJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsSUFBSTtvQkFDYixLQUFLLHFDQUE2QjtpQkFDbEM7Z0JBQ0QsNkJBQTZCLEVBQUU7b0JBQzlCLFdBQVcsRUFBRSwrQkFBK0I7b0JBQzVDLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJO29CQUNiLEtBQUssbUNBQTJCO2lCQUNoQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUVwQixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7UUFDckQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDbEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUM5QyxPQUFPLEVBQUUsS0FBSztTQUNkLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVJQUF1SSxFQUFFO1FBQzdJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGlDQUF5QjtTQUNqRCxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiwrQkFBK0IsRUFDL0IsT0FBTyxFQUNQLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0lBQWdJLEVBQUU7UUFDdEksb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQixPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUlBQW1JLEVBQUU7UUFDekksb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQixPQUFPLEVBQ1AsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsd0NBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxSUFBcUksRUFBRTtRQUMzSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQTRCO1lBQzdFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxpQ0FBeUI7U0FDakQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQTRCLG9CQUFvQixDQUFDLGNBQWMsQ0FDOUUsdUJBQXVCLEVBQ3ZCLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUM3QixDQUFBO1FBRUQsVUFBVSxDQUFDLDBCQUEwQixDQUNwQyxJQUFJLEVBQ0osNkJBQTZCLEVBQzdCLE9BQU8sRUFDUCxTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtJQUFrSSxFQUFFO1FBQ3hJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGlDQUF5QjtTQUNqRCxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiw2QkFBNkIsRUFDN0IsT0FBTyxFQUNQLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDN0IsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhIQUE4SCxFQUFFO1FBQ3BJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLDhCQUFzQjtTQUM5QyxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiw2QkFBNkIsRUFDN0IsT0FBTyxFQUNQLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDN0IsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlJQUFpSSxFQUFFO1FBQ3ZJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLDhCQUFzQjtTQUM5QyxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiw2QkFBNkIsRUFDN0IsT0FBTyxFQUNQLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0VBQStFLEVBQUU7UUFDckYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsaUNBQXlCO1NBQ2pELENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQixPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLCtDQUF1QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUU7UUFDM0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsbUNBRXBDLDZCQUE2QixFQUM3QixPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLG1DQUEyQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMERBQTBELEVBQUU7UUFDaEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsd0NBRXBDLDZCQUE2QixFQUM3QixPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUU7UUFDN0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsK0NBRXBDLDZCQUE2QixFQUM3QixPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLCtDQUF1QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUlBQXVJLEVBQUU7UUFDN0ksb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsaUNBQXlCO1NBQ2pELENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQixTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdJQUFnSSxFQUFFO1FBQ3RJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLDhCQUFzQjtTQUM5QyxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiwrQkFBK0IsRUFDL0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUlBQW1JLEVBQUU7UUFDekksb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQixTQUFTLEVBQ1QsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFJQUFxSSxFQUFFO1FBQzNJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGlDQUF5QjtTQUNqRCxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQUMsSUFBSSxFQUFFLDZCQUE2QixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyx3Q0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtJQUFrSSxFQUFFO1FBQ3hJLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBNEI7WUFDN0UsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLGlDQUF5QjtTQUNqRCxDQUFDLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBNEIsb0JBQW9CLENBQUMsY0FBYyxDQUM5RSx1QkFBdUIsRUFDdkIsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQzdCLENBQUE7UUFFRCxVQUFVLENBQUMsMEJBQTBCLENBQ3BDLElBQUksRUFDSiw2QkFBNkIsRUFDN0IsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLHdDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEhBQThILEVBQUU7UUFDcEksb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUE0QjtZQUM3RSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1NBQzlDLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE0QixvQkFBb0IsQ0FBQyxjQUFjLENBQzlFLHVCQUF1QixFQUN2QixzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FDN0IsQ0FBQTtRQUVELFVBQVUsQ0FBQywwQkFBMEIsQ0FDcEMsSUFBSSxFQUNKLDZCQUE2QixFQUM3QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQzdCLFNBQVMsQ0FDVCxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsd0NBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpSUFBaUksRUFBRTtRQUN2SSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQTRCO1lBQzdFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSw4QkFBc0I7U0FDOUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQTRCLG9CQUFvQixDQUFDLGNBQWMsQ0FDOUUsdUJBQXVCLEVBQ3ZCLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUM3QixDQUFBO1FBRUQsVUFBVSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFaEcsTUFBTSxDQUFDLFdBQVcsd0NBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzRUFBc0UsRUFBRTtRQUM1RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQTRCO1lBQzdFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxpQ0FBeUI7U0FDakQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQTRCLG9CQUFvQixDQUFDLGNBQWMsQ0FDOUUsdUJBQXVCLEVBQ3ZCLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUM3QixDQUFBO1FBRUQsVUFBVSxDQUFDLDBCQUEwQixDQUNwQyxJQUFJLEVBQ0osK0JBQStCLEVBQy9CLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFDN0IsU0FBUyxDQUNULENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVywrQ0FBdUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==