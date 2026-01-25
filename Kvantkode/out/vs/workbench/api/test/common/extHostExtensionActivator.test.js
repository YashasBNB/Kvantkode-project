/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers, timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { EmptyExtension, ExtensionActivationTimes, ExtensionsActivator, } from '../../common/extHostExtensionActivator.js';
import { ExtensionDescriptionRegistry, } from '../../../services/extensions/common/extensionDescriptionRegistry.js';
suite('ExtensionsActivator', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const idA = new ExtensionIdentifier(`a`);
    const idB = new ExtensionIdentifier(`b`);
    const idC = new ExtensionIdentifier(`c`);
    test('calls activate only once with sequential activations', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [desc(idA)]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('calls activate only once with parallel activations', async () => {
        const extActivation = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([[idA, extActivation]]);
        const activator = createActivator(host, [desc(idA, [], ['evt1', 'evt2'])]);
        const activate1 = activator.activateByEvent('evt1', false);
        const activate2 = activator.activateByEvent('evt2', false);
        extActivation.resolve();
        await activate1;
        await activate2;
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('activates dependencies first', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
        ]);
        const activator = createActivator(host, [desc(idA, [idB], ['evt1']), desc(idB, [], ['evt1'])]);
        const activate = activator.activateByEvent('evt1', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await timeout(0);
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
    });
    test('Supports having resolved extensions', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const bExt = desc(idB);
        delete bExt.main;
        delete bExt.browser;
        const activator = createActivator(host, [desc(idA, [idB])], [bExt]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
    });
    test('Supports having external extensions', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
        ]);
        const bExt = desc(idB);
        bExt.api = 'none';
        const activator = createActivator(host, [desc(idA, [idB])], [bExt]);
        const activate = activator.activateByEvent('*', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
    });
    test('Error: activateById with missing extension', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [desc(idA), desc(idB)]);
        let error = undefined;
        try {
            await activator.activateById(idC, {
                startup: false,
                extensionId: idC,
                activationEvent: 'none',
            });
        }
        catch (err) {
            error = err;
        }
        assert.strictEqual(typeof error === 'undefined', false);
    });
    test('Error: dependency missing', async () => {
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [desc(idA, [idB])]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.errors.length, 1);
        assert.deepStrictEqual(host.errors[0][0], idA);
    });
    test('Error: dependency activation failed', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
        ]);
        const activator = createActivator(host, [desc(idA, [idB]), desc(idB)]);
        const activate = activator.activateByEvent('*', false);
        extActivationB.reject(new Error(`b fails!`));
        await activate;
        assert.deepStrictEqual(host.errors.length, 2);
        assert.deepStrictEqual(host.errors[0][0], idB);
        assert.deepStrictEqual(host.errors[1][0], idA);
    });
    test('issue #144518: Problem with git extension and vscode-icons', async () => {
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const extActivationC = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
            [idC, extActivationC],
        ]);
        const activator = createActivator(host, [desc(idA, [idB]), desc(idB), desc(idC)]);
        activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idB, idC]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idC, idA]);
        extActivationA.resolve();
    });
    class SimpleExtensionsActivatorHost {
        constructor() {
            this.activateCalls = [];
            this.errors = [];
        }
        onExtensionActivationError(extensionId, error, missingExtensionDependency) {
            this.errors.push([extensionId, error, missingExtensionDependency]);
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
    }
    class PromiseExtensionsActivatorHost extends SimpleExtensionsActivatorHost {
        constructor(_promises) {
            super();
            this._promises = _promises;
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            for (const [id, promiseSource] of this._promises) {
                if (id.value === extensionId.value) {
                    return promiseSource.promise;
                }
            }
            throw new Error(`Unexpected!`);
        }
    }
    class ExtensionActivationPromiseSource {
        constructor() {
            ;
            ({
                promise: this.promise,
                resolve: this._resolve,
                reject: this._reject,
            } = promiseWithResolvers());
        }
        resolve() {
            this._resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        reject(err) {
            this._reject(err);
        }
    }
    const basicActivationEventsReader = {
        readActivationEvents: (extensionDescription) => {
            return extensionDescription.activationEvents ?? [];
        },
    };
    function createActivator(host, extensionDescriptions, otherHostExtensionDescriptions = []) {
        const registry = new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions);
        const globalRegistry = new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions.concat(otherHostExtensionDescriptions));
        return new ExtensionsActivator(registry, globalRegistry, host, new NullLogService());
    }
    function desc(id, deps = [], activationEvents = ['*']) {
        return {
            name: id.value,
            publisher: 'test',
            version: '0.0.0',
            engines: { vscode: '^1.0.0' },
            identifier: id,
            extensionLocation: URI.parse(`nothing://nowhere`),
            isBuiltin: false,
            isUnderDevelopment: false,
            isUserBuiltin: false,
            activationEvents,
            main: 'index.js',
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            extensionDependencies: deps.map((d) => d.value),
            enabledApiProposals: undefined,
            preRelease: false,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvY29tbW9uL2V4dEhvc3RFeHRlbnNpb25BY3RpdmF0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWhGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFFTixjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLG1CQUFtQixHQUVuQixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFDTiw0QkFBNEIsR0FFNUIsTUFBTSxxRUFBcUUsQ0FBQTtBQU01RSxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN4QyxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3hDLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFeEMsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZFLE1BQU0sSUFBSSxHQUFHLElB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