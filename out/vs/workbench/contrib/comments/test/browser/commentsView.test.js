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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL3Rlc3QvYnJvd3Nlci9jb21tZW50c1ZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sY0FBYyxFQUdkLGVBQWUsR0FFZixNQUFNLGlDQUFpQyxDQUFBO0FBU3hDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxPQUFPLEVBR04sc0JBQXNCLEdBR3RCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUVqRyxNQUFNLGlCQUFpQjtJQUN0Qix1QkFBdUI7UUFDdEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFD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