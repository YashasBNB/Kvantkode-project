/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Part } from '../../browser/part.js';
import { isEmptyObject } from '../../../base/common/types.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { append, $, hide } from '../../../base/browser/dom.js';
import { TestLayoutService } from './workbenchTestServices.js';
import { TestStorageService } from '../common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { mainWindow } from '../../../base/browser/window.js';
suite('Workbench parts', () => {
    const disposables = new DisposableStore();
    class SimplePart extends Part {
        constructor() {
            super(...arguments);
            this.minimumWidth = 50;
            this.maximumWidth = 50;
            this.minimumHeight = 50;
            this.maximumHeight = 50;
        }
        layout(width, height) {
            throw new Error('Method not implemented.');
        }
        toJSON() {
            throw new Error('Method not implemented.');
        }
    }
    class MyPart extends SimplePart {
        constructor(expectedParent) {
            super('myPart', { hasTitle: true }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
            this.expectedParent = expectedParent;
        }
        createTitleArea(parent) {
            assert.strictEqual(parent, this.expectedParent);
            return super.createTitleArea(parent);
        }
        createContentArea(parent) {
            assert.strictEqual(parent, this.expectedParent);
            return super.createContentArea(parent);
        }
        testGetMemento(scope, target) {
            return super.getMemento(scope, target);
        }
        testSaveState() {
            return super.saveState();
        }
    }
    class MyPart2 extends SimplePart {
        constructor() {
            super('myPart2', { hasTitle: true }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
        }
        createTitleArea(parent) {
            const titleContainer = append(parent, $('div'));
            const titleLabel = append(titleContainer, $('span'));
            titleLabel.id = 'myPart.title';
            titleLabel.innerText = 'Title';
            return titleContainer;
        }
        createContentArea(parent) {
            const contentContainer = append(parent, $('div'));
            const contentSpan = append(contentContainer, $('span'));
            contentSpan.id = 'myPart.content';
            contentSpan.innerText = 'Content';
            return contentContainer;
        }
    }
    class MyPart3 extends SimplePart {
        constructor() {
            super('myPart2', { hasTitle: false }, new TestThemeService(), disposables.add(new TestStorageService()), new TestLayoutService());
        }
        createTitleArea(parent) {
            return null;
        }
        createContentArea(parent) {
            const contentContainer = append(parent, $('div'));
            const contentSpan = append(contentContainer, $('span'));
            contentSpan.id = 'myPart.content';
            contentSpan.innerText = 'Content';
            return contentContainer;
        }
    }
    let fixture;
    const fixtureId = 'workbench-part-fixture';
    setup(() => {
        fixture = document.createElement('div');
        fixture.id = fixtureId;
        mainWindow.document.body.appendChild(fixture);
    });
    teardown(() => {
        fixture.remove();
        disposables.clear();
    });
    test('Creation', () => {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        let part = disposables.add(new MyPart(b));
        part.create(b);
        assert.strictEqual(part.getId(), 'myPart');
        // Memento
        let memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        memento.foo = 'bar';
        memento.bar = [1, 2, 3];
        part.testSaveState();
        // Re-Create to assert memento contents
        part = disposables.add(new MyPart(b));
        memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        assert.strictEqual(memento.foo, 'bar');
        assert.strictEqual(memento.bar.length, 3);
        // Empty Memento stores empty object
        delete memento.foo;
        delete memento.bar;
        part.testSaveState();
        part = disposables.add(new MyPart(b));
        memento = part.testGetMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        assert(memento);
        assert.strictEqual(isEmptyObject(memento), true);
    });
    test('Part Layout with Title and Content', function () {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        const part = disposables.add(new MyPart2());
        part.create(b);
        assert(mainWindow.document.getElementById('myPart.title'));
        assert(mainWindow.document.getElementById('myPart.content'));
    });
    test('Part Layout with Content only', function () {
        const b = document.createElement('div');
        mainWindow.document.getElementById(fixtureId).appendChild(b);
        hide(b);
        const part = disposables.add(new MyPart3());
        part.create(b);
        assert(!mainWindow.document.getElementById('myPart.title'));
        assert(mainWindow.document.getElementById('myPart.content'));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU1RCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsTUFBTSxVQUFXLFNBQVEsSUFBSTtRQUE3Qjs7WUFDQyxpQkFBWSxHQUFXLEVBQUUsQ0FBQTtZQUN6QixpQkFBWSxHQUFXLEVBQUUsQ0FBQTtZQUN6QixrQkFBYSxHQUFXLEVBQUUsQ0FBQTtZQUMxQixrQkFBYSxHQUFXLEVBQUUsQ0FBQTtRQVMzQixDQUFDO1FBUFMsTUFBTSxDQUFDLEtBQWEsRUFBRSxNQUFjO1lBQzVDLE1B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