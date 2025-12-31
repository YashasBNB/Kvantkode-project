/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { Memento } from '../../common/memento.js';
import { TestStorageService } from './workbenchTestServices.js';
suite('Memento', () => {
    const disposables = new DisposableStore();
    let storage;
    setup(() => {
        storage = disposables.add(new TestStorageService());
        Memento.clear(-1 /* StorageScope.APPLICATION */);
        Memento.clear(0 /* StorageScope.PROFILE */);
        Memento.clear(1 /* StorageScope.WORKSPACE */);
    });
    teardown(() => {
        disposables.clear();
    });
    test('Loading and Saving Memento with Scopes', () => {
        const myMemento = new Memento('memento.test', storage);
        // Application
        let memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        let applicationMemento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(applicationMemento, memento);
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [4, 5, 6];
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        myMemento.saveMemento();
        // Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3] });
        applicationMemento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(applicationMemento, memento);
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [4, 5, 6] });
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World' });
        // Assert the Mementos are stored properly in storage
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', -1 /* StorageScope.APPLICATION */)), { foo: [1, 2, 3] });
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', 0 /* StorageScope.PROFILE */)), {
            foo: [4, 5, 6],
        });
        assert.deepStrictEqual(JSON.parse(storage.get('memento/memento.test', 1 /* StorageScope.WORKSPACE */)), { foo: 'Hello World' });
        // Delete Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        myMemento.saveMemento();
        // Application
        memento = myMemento.getMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Assert the Mementos are also removed from storage
        assert.strictEqual(storage.get('memento/memento.test', -1 /* StorageScope.APPLICATION */, null), null);
        assert.strictEqual(storage.get('memento/memento.test', 0 /* StorageScope.PROFILE */, null), null);
        assert.strictEqual(storage.get('memento/memento.test', 1 /* StorageScope.WORKSPACE */, null), null);
    });
    test('Save and Load', () => {
        const myMemento = new Memento('memento.test', storage);
        // Profile
        let memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3] });
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World' });
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [4, 5, 6];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'World Hello';
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [4, 5, 6] });
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'World Hello' });
        // Delete Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        // Delete Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        delete memento.foo;
        myMemento.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, {});
    });
    test('Save and Load - 2 Components with same id', () => {
        const myMemento = new Memento('memento.test', storage);
        const myMemento2 = new Memento('memento.test', storage);
        // Profile
        let memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.foo = [1, 2, 3];
        memento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        memento.bar = [1, 2, 3];
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'Hello World';
        memento = myMemento2.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.bar = 'Hello World';
        myMemento.saveMemento();
        myMemento2.saveMemento();
        // Profile
        memento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3], bar: [1, 2, 3] });
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        memento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: [1, 2, 3], bar: [1, 2, 3] });
        profileMemento = myMemento2.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, memento);
        // Workspace
        memento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World', bar: 'Hello World' });
        memento = myMemento2.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(memento, { foo: 'Hello World', bar: 'Hello World' });
    });
    test('Clear Memento', () => {
        let myMemento = new Memento('memento.test', storage);
        // Profile
        let profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        profileMemento.foo = 'Hello World';
        // Workspace
        let workspaceMemento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        workspaceMemento.bar = 'Hello World';
        myMemento.saveMemento();
        // Clear
        storage = disposables.add(new TestStorageService());
        Memento.clear(0 /* StorageScope.PROFILE */);
        Memento.clear(1 /* StorageScope.WORKSPACE */);
        myMemento = new Memento('memento.test', storage);
        profileMemento = myMemento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        workspaceMemento = myMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        assert.deepStrictEqual(profileMemento, {});
        assert.deepStrictEqual(workspaceMemento, {});
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtZW50by50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvY29tbW9uL21lbWVudG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBTTVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUvRCxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksT0FBd0IsQ0FBQTtJQUU1QixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUE7UUFDbkQsT0FBTyxDQUFDLEtBQUssbUNBQTBCLENBQUE7UUFDdkMsT0FBTyxDQUFDLEtBQUssOEJBQXNCLENBQUE7UUFDbkMsT0FBTyxDQUFDLEtBQUssZ0NBQXdCLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFdEQsY0FBYztRQUNkLElBQUks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