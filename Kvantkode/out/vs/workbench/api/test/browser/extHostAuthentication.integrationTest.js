/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { MainThreadAuthentication } from '../../browser/mainThreadAuthentication.js';
import { ExtHostContext, MainContext } from '../../common/extHost.protocol.js';
import { ExtHostAuthentication } from '../../common/extHostAuthentication.js';
import { IActivityService } from '../../../services/activity/common/activity.js';
import { AuthenticationService } from '../../../services/authentication/browser/authenticationService.js';
import { IAuthenticationExtensionsService, IAuthenticationService, } from '../../../services/authentication/common/authentication.js';
import { IExtensionService, nullExtensionDescription as extensionDescription, } from '../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { TestEnvironmentService, TestQuickInputService, TestRemoteAgentService, } from '../../../test/browser/workbenchTestServices.js';
import { TestActivityService, TestExtensionService, TestProductService, TestStorageService, } from '../../../test/common/workbenchTestServices.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { AuthenticationAccessService, IAuthenticationAccessService, } from '../../../services/authentication/browser/authenticationAccessService.js';
import { AuthenticationUsageService, IAuthenticationUsageService, } from '../../../services/authentication/browser/authenticationUsageService.js';
import { AuthenticationExtensionsService } from '../../../services/authentication/browser/authenticationExtensionsService.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
class AuthQuickPick {
    constructor() {
        this.items = [];
    }
    get selectedItems() {
        return this.items;
    }
    onDidAccept(listener) {
        this.listener = listener;
    }
    onDidHide(listener) { }
    dispose() { }
    show() {
        this.listener({
            inBackground: false,
        });
    }
}
class AuthTestQuickInputService extends TestQuickInputService {
    createQuickPick() {
        return new AuthQuickPick();
    }
}
class TestAuthProvider {
    constructor(authProviderName) {
        this.authProviderName = authProviderName;
        this.id = 1;
        this.sessions = new Map();
        this.onDidChangeSessions = () => {
            return { dispose() { } };
        };
    }
    async getSessions(scopes) {
        if (!scopes) {
            return [...this.sessions.values()];
        }
        if (scopes[0] === 'return multiple') {
            return [...this.sessions.values()];
        }
        const sessions = this.sessions.get(scopes.join(' '));
        return sessions ? [sessions] : [];
    }
    async createSession(scopes) {
        const scopesStr = scopes.join(' ');
        const session = {
            scopes,
            id: `${this.id}`,
            account: {
                label: this.authProviderName,
                id: `${this.id}`,
            },
            accessToken: Math.random() + '',
        };
        this.sessions.set(scopesStr, session);
        this.id++;
        return session;
    }
    async removeSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}
suite('ExtHostAuthentication', () => {
    let disposables;
    let extHostAuthentication;
    let instantiationService;
    suiteSetup(async () => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IDialogService, new TestDialogService({ confirmed: true }));
        instantiationService.stub(IStorageService, new TestStorageService());
        instantiationService.stub(IQuickInputService, new AuthTestQuickInputService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IActivityService, new TestActivityService());
        instantiationService.stub(IRemoteAgentService, new TestRemoteAgentService());
        instantiationService.stub(INotificationService, new TestNotificationService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IBrowserWorkbenchEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IProductService, TestProductService);
        instantiationService.stub(IAuthenticationAccessService, instantiationService.createInstance(AuthenticationAccessService));
        instantiationService.stub(IAuthenticationService, instantiationService.createInstance(AuthenticationService));
        instantiationService.stub(IAuthenticationUsageService, instantiationService.createInstance(AuthenticationUsageService));
        const rpcProtocol = new TestRPCProtocol();
        instantiationService.stub(IAuthenticationExtensionsService, instantiationService.createInstance(AuthenticationExtensionsService));
        rpcProtocol.set(MainContext.MainThreadAuthentication, instantiationService.createInstance(MainThreadAuthentication, rpcProtocol));
        extHostAuthentication = new ExtHostAuthentication(rpcProtocol);
        rpcProtocol.set(ExtHostContext.ExtHostAuthentication, extHostAuthentication);
    });
    setup(async () => {
        disposables = new DisposableStore();
        disposables.add(extHostAuthentication.registerAuthenticationProvider('test', 'test provider', new TestAuthProvider('test')));
        disposables.add(extHostAuthentication.registerAuthenticationProvider('test-multiple', 'test multiple provider', new TestAuthProvider('test-multiple'), { supportsMultipleAccounts: true }));
    });
    suiteTeardown(() => {
        instantiationService.dispose();
    });
    teardown(() => {
        disposables.dispose();
    });
    test('createIfNone - true', async () => {
        const scopes = ['foo'];
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('createIfNone - false', async () => {
        const scopes = ['foo'];
        const nosession = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {});
        assert.strictEqual(nosession, undefined);
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {});
        assert.strictEqual(session2?.id, session.id);
        assert.strictEqual(session2?.scopes[0], session.scopes[0]);
        assert.strictEqual(session2?.accessToken, session.accessToken);
    });
    // should behave the same as createIfNone: false
    test('silent - true', async () => {
        const scopes = ['foo'];
        const nosession = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            silent: true,
        });
        assert.strictEqual(nosession, undefined);
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            silent: true,
        });
        assert.strictEqual(session.id, session2?.id);
        assert.strictEqual(session.scopes[0], session2?.scopes[0]);
    });
    test('forceNewSession - true - existing session', async () => {
        const scopes = ['foo'];
        const session1 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true,
        });
        // Now create the session
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: true,
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.notStrictEqual(session1.accessToken, session2?.accessToken);
    });
    // Should behave like createIfNone: true
    test('forceNewSession - true - no existing session', async () => {
        const scopes = ['foo'];
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('forceNewSession - detail', async () => {
        const scopes = ['foo'];
        const session1 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true,
        });
        // Now create the session
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: { detail: 'bar' },
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.notStrictEqual(session1.accessToken, session2?.accessToken);
    });
    //#region Multi-Account AuthProvider
    test('clearSessionPreference - true', async () => {
        const scopes = ['foo'];
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], scopes[0]);
        const scopes2 = ['bar'];
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {
            createIfNone: true,
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], scopes2[0]);
        const session3 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['return multiple'], {
            clearSessionPreference: true,
            createIfNone: true,
        });
        // clearing session preference causes us to get the first session
        // because it would normally show a quick pick for the user to choose
        assert.strictEqual(session3?.id, session.id);
        assert.strictEqual(session3?.scopes[0], session.scopes[0]);
        assert.strictEqual(session3?.accessToken, session.accessToken);
    });
    test('silently getting session should return a session (if any) regardless of preference - fixes #137819', async () => {
        const scopes = ['foo'];
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], scopes[0]);
        const scopes2 = ['bar'];
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {
            createIfNone: true,
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], scopes2[0]);
        const shouldBeSession1 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {});
        assert.strictEqual(shouldBeSession1?.id, session.id);
        assert.strictEqual(shouldBeSession1?.scopes[0], session.scopes[0]);
        assert.strictEqual(shouldBeSession1?.accessToken, session.accessToken);
        const shouldBeSession2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {});
        assert.strictEqual(shouldBeSession2?.id, session2.id);
        assert.strictEqual(shouldBeSession2?.scopes[0], session2.scopes[0]);
        assert.strictEqual(shouldBeSession2?.accessToken, session2.accessToken);
    });
    //#endregion
    //#region error cases
    test('createIfNone and forceNewSession', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                createIfNone: true,
                forceNewSession: true,
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('forceNewSession and silent', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                forceNewSession: true,
                silent: true,
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('createIfNone and silent', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                createIfNone: true,
                silent: true,
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('Can get multiple sessions (with different scopes) in one extension', async () => {
        let session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true,
        });
        session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['bar'], {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '2');
        assert.strictEqual(session?.scopes[0], 'bar');
        session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: false,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('Can get multiple sessions (from different providers) in one extension', async () => {
        let session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true,
        });
        session = await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
            createIfNone: true,
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        assert.strictEqual(session?.account.label, 'test');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: false,
        });
        assert.strictEqual(session2?.id, '1');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.strictEqual(session2?.account.label, 'test-multiple');
    });
    test('Can get multiple sessions (from different providers) in one extension at the same time', async () => {
        const sessionP = extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
            createIfNone: true,
        });
        const session2P = extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true,
        });
        const session = await sessionP;
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        assert.strictEqual(session?.account.label, 'test');
        const session2 = await session2P;
        assert.strictEqual(session2?.id, '1');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.strictEqual(session2?.account.label, 'test-multiple');
    });
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNsSCxPQUFPLEVBRU4sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDekcsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxzQkFBc0IsR0FDdEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHdCQUF3QixJQUFJLG9CQUFvQixHQUNoRCxNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUNyQixzQkFBc0IsR0FDdEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0sK0NBQStDLENBQUE7QUFFdEQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsNEJBQTRCLEdBQzVCLE1BQU0seUVBQXlFLENBQUE7QUFDaEYsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwyQkFBMkIsR0FDM0IsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUM3SCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBGLE1BQU0sYUFBYTtJQUFuQjtRQUVRLFVBQUssR0FBRyxFQUFFLENBQUE7SUFlbEIsQ0FBQztJQWRBLElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUE4QztRQUN6RCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtJQUN6QixDQUFDO0lBQ0QsU0FBUyxDQUFDLFFBQTBDLElBQUcsQ0FBQztJQUN4RCxPQUFPLEtBQUksQ0FBQztJQUNaLElBQUk7UUFDSCxJQUFJLENBQUMsUUFBUyxDQUFDO1lBQ2QsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBQ0QsTUFBTSx5QkFBMEIsU0FBUSxxQkFBcUI7SUFDbkQsZUFBZTtRQUN2QixPQUFZLElBQUksYUFBYSxFQUFFLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxnQkFBZ0I7SUFNckIsWUFBNkIsZ0JBQXdCO1FBQXhCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtRQUw3QyxPQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ04sYUFBUSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFBO1FBQzNELHdCQUFtQixHQUFHLEdBQUcsRUFBRTtZQUMxQixPQUFPLEVBQUUsT0FBTyxLQUFJLENBQUMsRUFBRSxDQUFBO1FBQ3hCLENBQUMsQ0FBQTtJQUN1RCxDQUFDO0lBQ3pELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBMEI7UUFDM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUNELEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBeUI7UUFDNUMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQyxNQUFNLE9BQU8sR0FBRztZQUNmLE1BQU07WUFDTixFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2hCLE9BQU8sRUFBRTtnQkFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtnQkFDNUIsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRTthQUNoQjtZQUNELFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtTQUMvQixDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQTtRQUNULE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUNELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUI7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxJQUFJLFdBQTRCLENBQUE7SUFFaEMsSUFBSSxxQkFBNEMsQ0FBQTtJQUNoRCxJQUFJLG9CQUE4QyxDQUFBO0lBRWxELFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNyQixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7UUFDckQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUE7UUFDNUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLGlCQUFpQixDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1FBQ3BFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLHlCQUF5QixFQUFFLENBQUMsQ0FBQTtRQUM5RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFFeEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7UUFDOUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDbEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDdEYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQzlELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsNEJBQTRCLEVBQzVCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUNoRSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixzQkFBc0IsRUFDdEIsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQzFELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLDJCQUEyQixFQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLENBQUMsQ0FDL0QsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekMsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixnQ0FBZ0MsRUFDaEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQ3BFLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyx3QkFBd0IsRUFDcEMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLFdBQVcsQ0FBQyxDQUMxRSxDQUFBO1FBQ0QscUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5RCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBQzdFLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQ2QscUJBQXFCLENBQUMsOEJBQThCLENBQ25ELE1BQU0sRUFDTixlQUFlLEVBQ2YsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FDNUIsQ0FDRCxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FDbkQsZUFBZSxFQUNmLHdCQUF3QixFQUN4QixJQUFJLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUNyQyxFQUFFLHdCQUF3QixFQUFFLElBQUksRUFBRSxDQUNsQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLGFBQWEsQ0FBQyxHQUFHLEVBQUU7UUFDbEIsb0JBQW9CLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUM1RixZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3ZELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFeEMseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDNUYsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUU3QyxNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixNQUFNLEVBQ04sRUFBRSxDQUNGLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUMvRCxDQUFDLENBQUMsQ0FBQTtJQUVGLGdEQUFnRDtJQUNoRCxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUM5RixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRXhDLHlCQUF5QjtRQUN6QixNQUFNLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFO1lBQzVGLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFN0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUM3RixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDN0YsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDN0YsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsd0NBQXdDO0lBQ3hDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDNUYsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDN0YsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDN0YsZUFBZSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtTQUNsQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixvQ0FBb0M7SUFFcEMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEIseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUNyRCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE1BQU0sRUFDTjtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2QixNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEQsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixPQUFPLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN0RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsaUJBQWlCLENBQUMsRUFDbkI7WUFDQyxzQkFBc0IsRUFBRSxJQUFJO1lBQzVCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQTtRQUVELGlFQUFpRTtRQUNqRSxxRUFBcUU7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDL0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0dBQW9HLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckgsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0Qix5QkFBeUI7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3JELG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsTUFBTSxFQUNOO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FDRCxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVqRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN0RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE9BQU8sRUFDUDtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDOUQsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixNQUFNLEVBQ04sRUFBRSxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUV0RSxNQUFNLGdCQUFnQixHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUM5RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE9BQU8sRUFDUCxFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsWUFBWTtJQUVaLHFCQUFxQjtJQUVyQixJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzdFLFlBQVksRUFBRSxJQUFJO2dCQUNsQixlQUFlLEVBQUUsSUFBSTthQUNyQixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLElBQUksQ0FBQztZQUNKLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUM3RSxlQUFlLEVBQUUsSUFBSTtnQkFDckIsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFDLElBQUksQ0FBQztZQUNKLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUM3RSxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JGLElBQUksT0FBTyxHQUFzQyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEYsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUMvQyxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdDLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDL0Msb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1RUFBdUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RixJQUFJLE9BQU8sR0FBc0MsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RGLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsQ0FBQyxLQUFLLENBQUMsRUFDUDtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQTtRQUNELE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN2RixZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RELG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsQ0FBQyxLQUFLLENBQUMsRUFDUDtZQUNDLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RkFBd0YsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RyxNQUFNLFFBQVEsR0FBK0MscUJBQXFCLENBQUMsVUFBVSxDQUM1RixvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLENBQUMsS0FBSyxDQUFDLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUNELENBQUE7UUFDRCxNQUFNLFNBQVMsR0FBK0MscUJBQXFCLENBQUMsVUFBVSxDQUM3RixvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQTtRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQzdELENBQUMsQ0FBQyxDQUFBO0lBRUYsWUFBWTtBQUNiLENBQUMsQ0FBQyxDQUFBIn0=