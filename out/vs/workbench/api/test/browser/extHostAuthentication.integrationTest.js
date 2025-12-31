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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RBdXRoZW50aWNhdGlvbi5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDckgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDbEgsT0FBTyxFQUVOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtD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