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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVtZW50by50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9jb21tb24vbWVtZW50by50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFNNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRS9ELEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsSUFBSSxPQUF3QixDQUFBO0lBRTVCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUNuRCxPQUFPLENBQUMsS0FBSyxtQ0FBMEIsQ0FBQTtRQUN2QyxPQUFPLENBQUMsS0FBSyw4QkFBc0IsQ0FBQTtRQUNuQyxPQUFPLENBQUMsS0FBSyxnQ0FBd0IsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUV0RCxjQUFjO1FBQ2Qs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