/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { CommentsPanel } from '../../browser/commentsView.js';
import { CommentService, ICommentService, } from '../../browser/commentService.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IViewDescriptorService, } from '../../../../common/views.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
class TestCommentThread {
    isDocumentCommentThread() {
        return true;
    }
    constructor(commentThreadHandle, controllerHandle, threadId, resource, range, comments) {
        this.commentThreadHandle = commentThreadHandle;
        this.controllerHandle = controllerHandle;
        this.threadId = threadId;
        this.resource = resource;
        this.range = range;
        this.comments = comments;
        this.onDidChangeComments = new Emitter().event;
        this.onDidChangeInitialCollapsibleState = new Emitter().event;
        this.canReply = false;
        this.onDidChangeInput = new Emitter().event;
        this.onDidChangeRange = new Emitter().event;
        this.onDidChangeLabel = new Emitter().event;
        this.onDidChangeCollapsibleState = new Emitter().event;
        this.onDidChangeState = new Emitter().event;
        this.onDidChangeCanReply = new Emitter().event;
        this.isDisposed = false;
        this.isTemplate = false;
        this.label = undefined;
        this.contextValue = undefined;
    }
}
class TestCommentController {
    constructor() {
        this.id = 'test';
        this.label = 'Test Comments';
        this.owner = 'test';
        this.features = {};
    }
    createCommentThreadTemplate(resource, range) {
        throw new Error('Method not implemented.');
    }
    updateCommentThreadTemplate(threadHandle, range) {
        throw new Error('Method not implemented.');
    }
    deleteCommentThreadMain(commentThreadId) {
        throw new Error('Method not implemented.');
    }
    toggleReaction(uri, thread, comment, reaction, token) {
        throw new Error('Method not implemented.');
    }
    getDocumentComments(resource, token) {
        throw new Error('Method not implemented.');
    }
    getNotebookComments(resource, token) {
        throw new Error('Method not implemented.');
    }
    setActiveCommentAndThread(commentInfo) {
        throw new Error('Method not implemented.');
    }
}
export class TestViewDescriptorService {
    constructor() {
        this.onDidChangeLocation = new Emitter().event;
    }
    getViewLocationById(id) {
        return 1 /* ViewContainerLocation.Panel */;
    }
    getViewDescriptorById(id) {
        return null;
    }
    getViewContainerByViewId(id) {
        return {
            id: 'comments',
            title: { value: 'Comments', original: 'Comments' },
            ctorDescriptor: {},
        };
    }
    getViewContainerModel(viewContainer) {
        const partialViewContainerModel = {
            onDidChangeContainerInfo: new Emitter().event,
        };
        return partialViewContainerModel;
    }
    getDefaultContainerById(id) {
        return null;
    }
}
suite('Comments View', function () {
    teardown(() => {
        instantiationService.dispose();
        commentService.dispose();
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    let disposables;
    let instantiationService;
    let commentService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService({}, disposables);
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IHoverService, NullHoverService);
        instantiationService.stub(IContextViewService, {});
        instantiationService.stub(IViewDescriptorService, new TestViewDescriptorService());
        commentService = instantiationService.createInstance(CommentService);
        instantiationService.stub(ICommentService, commentService);
        commentService.registerCommentController('test', new TestCommentController());
    });
    test('collapse all', async function () {
        const view = instantiationService.createInstance(CommentsPanel, {
            id: 'comments',
            title: 'Comments',
        });
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [
                { body: 'test', uniqueIdInThread: 1, userName: 'alex' },
            ]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [
                { body: 'test', uniqueIdInThread: 1, userName: 'alex' },
            ]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.areAllCommentsExpanded(), true);
        view.collapseAll();
        assert.strictEqual(view.isSomeCommentsExpanded(), false);
        view.dispose();
    });
    test('expand all', async function () {
        const view = instantiationService.createInstance(CommentsPanel, {
            id: 'comments',
            title: 'Comments',
        });
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [
                { body: 'test', uniqueIdInThread: 1, userName: 'alex' },
            ]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [
                { body: 'test', uniqueIdInThread: 1, userName: 'alex' },
            ]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        view.collapseAll();
        assert.strictEqual(view.isSomeCommentsExpanded(), false);
        view.expandAll();
        assert.strictEqual(view.areAllCommentsExpanded(), true);
        view.dispose();
    });
    test('filter by text', async function () {
        const view = instantiationService.createInstance(CommentsPanel, {
            id: 'comments',
            title: 'Comments',
        });
        view.setVisible(true);
        view.render();
        commentService.setWorkspaceComments('test', [
            new TestCommentThread(1, 1, '1', 'test1', new Range(1, 1, 1, 1), [
                { body: 'This comment is a cat.', uniqueIdInThread: 1, userName: 'alex' },
            ]),
            new TestCommentThread(2, 1, '1', 'test2', new Range(1, 1, 1, 1), [
                { body: 'This comment is a dog.', uniqueIdInThread: 1, userName: 'alex' },
            ]),
        ]);
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 2);
        view.getFilterWidget().setFilterText('cat');
        // Setting showResolved causes the filter to trigger for the purposes of this test.
        view.filters.showResolved = false;
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 1);
        view.clearFilterText();
        // Setting showResolved causes the filter to trigger for the purposes of this test.
        view.filters.showResolved = true;
        assert.strictEqual(view.getFilterStats().total, 2);
        assert.strictEqual(view.getFilterStats().filtered, 2);
        view.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy90ZXN0L2Jyb3dzZXIvY29tbWVudHNWaWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFHZCxlQUFlLEdBRWYsTUFBTSxpQ0FBaUMsQ0FBQTtBQVN4QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFFcEUsT0FBTyxFQUdOLHNCQUFzQixHQUd0QixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFakcsTUFBTSxpQkFBaUI7SUFDdEIsdUJBQXVCO1FBQ3RCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNE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