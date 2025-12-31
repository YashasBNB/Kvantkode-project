/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { AuthenticationService } from '../../browser/authenticationService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService, TestProductService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
function createSession() {
    return {
        id: 'session1',
        accessToken: 'token1',
        account: { id: 'account', label: 'Account' },
        scopes: ['test'],
    };
}
function createProvider(overrides = {}) {
    return {
        supportsMultipleAccounts: false,
        onDidChangeSessions: new Emitter().event,
        id: 'test',
        label: 'Test',
        getSessions: async () => [],
        createSession: async () => createSession(),
        removeSession: async () => { },
        ...overrides,
    };
}
suite('AuthenticationService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let authenticationService;
    setup(() => {
        const storageService = disposables.add(new TestStorageService());
        const authenticationAccessService = disposables.add(new AuthenticationAccessService(storageService, TestProductService));
        authenticationService = disposables.add(new AuthenticationService(new TestExtensionService(), authenticationAccessService, TestEnvironmentService, new NullLogService()));
    });
    teardown(() => {
        // Dispose the authentication service after each test
        authenticationService.dispose();
    });
    suite('declaredAuthenticationProviders', () => {
        test('registerDeclaredAuthenticationProvider', async () => {
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            const provider = {
                id: 'github',
                label: 'GitHub',
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            // Assert that the provider is added to the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 1);
            assert.deepEqual(authenticationService.declaredProviders[0], provider);
            await changed;
        });
        test('unregisterDeclaredAuthenticationProvider', async () => {
            const provider = {
                id: 'github',
                label: 'GitHub',
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            authenticationService.unregisterDeclaredAuthenticationProvider(provider.id);
            // Assert that the provider is removed from the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 0);
            await changed;
        });
    });
    suite('authenticationProviders', () => {
        test('isAuthenticationProviderRegistered', async () => {
            const registered = Event.toPromise(authenticationService.onDidRegisterAuthenticationProvider);
            const provider = createProvider();
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            const result = await registered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('unregisterAuthenticationProvider', async () => {
            const unregistered = Event.toPromise(authenticationService.onDidUnregisterAuthenticationProvider);
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            authenticationService.unregisterAuthenticationProvider(provider.id);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            const result = await unregistered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('getProviderIds', () => {
            const provider1 = createProvider({
                id: 'provider1',
                label: 'Provider 1',
            });
            const provider2 = createProvider({
                id: 'provider2',
                label: 'Provider 2',
            });
            authenticationService.registerAuthenticationProvider(provider1.id, provider1);
            authenticationService.registerAuthenticationProvider(provider2.id, provider2);
            const providerIds = authenticationService.getProviderIds();
            // Assert that the providerIds array contains the registered provider ids
            assert.deepEqual(providerIds, [provider1.id, provider2.id]);
        });
        test('getProvider', () => {
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const retrievedProvider = authenticationService.getProvider(provider.id);
            // Assert that the retrieved provider is the same as the registered provider
            assert.deepEqual(retrievedProvider, provider);
        });
    });
    suite('authenticationSessions', () => {
        test('getSessions', async () => {
            let isCalled = false;
            const provider = createProvider({
                getSessions: async () => {
                    isCalled = true;
                    return [createSession()];
                },
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const sessions = await authenticationService.getSessions(provider.id);
            assert.equal(sessions.length, 1);
            assert.ok(isCalled);
        });
        test('createSession', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                createSession: async () => {
                    const session = createSession();
                    emitter.fire({ added: [session], removed: [], changed: [] });
                    return session;
                },
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const session = await authenticationService.createSession(provider.id, ['repo']);
            // Assert that the created session matches the expected session and the event fires
            assert.ok(session);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [session], removed: [], changed: [] },
            });
        });
        test('removeSession', async () => {
            const emitter = new Emitter();
            const session = createSession();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                removeSession: async () => emitter.fire({ added: [], removed: [session], changed: [] }),
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            await authenticationService.removeSession(provider.id, session.id);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [session], changed: [] },
            });
        });
        test('onDidChangeSessions', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                getSessions: async () => [],
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            const session = createSession();
            emitter.fire({ added: [], removed: [], changed: [session] });
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [], changed: [session] },
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vdGVzdC9icm93c2VyL2F1dGhlbnRpY2F0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBTTlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixHQUNsQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxTQUFTLGFBQWE7SUFDckIsT0FBTztRQUNOLEVBQUUsRUFBRSxVQUFVO1FBQ2QsV0FBVyxFQUFFLFFBQVE7UUFDckIsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO1FBQzVDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUNoQixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLFlBQThDLEVBQUU7SUFDdkUsT0FBTztRQUNOLHdCQUF3QixFQUFFLEtBQUs7UUFDL0IsbUJBQW1CLEVBQUUsSUFBSSxPQUFPLEVBQXFD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