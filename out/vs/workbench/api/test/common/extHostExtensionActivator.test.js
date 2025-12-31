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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2NvbW1vbi9leHRIb3N0RXh0ZW5zaW9uQWN0aXZhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sY0FBYyxFQUNkLHdCQUF3QixFQUN4QixtQkFBbUIsR0FFbkIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sNEJBQTRCLEdBRTVCLE1BQU0scUVBQXFFLENBQUE7QUFNNUUsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN4QyxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRXhDLElBQUksQ0FBQyxzREFBc0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RSxNQUFNLElBQUksR0FBRyxJQUFJLDZC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