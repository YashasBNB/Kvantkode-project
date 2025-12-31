/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { BreadcrumbsModel } from '../../../../browser/parts/editor/breadcrumbsModel.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { TestContextService } from '../../../common/workbenchTestServices.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Breadcrumb Model', function () {
    let model;
    const workspaceService = new TestContextService(new Workspace('ffff', [
        new WorkspaceFolder({ uri: URI.parse('foo:/bar/baz/ws'), name: 'ws', index: 0 }),
    ]));
    const configService = new (class extends TestConfigurationService {
        getValue(...args) {
            if (args[0] === 'breadcrumbs.filePath') {
                return 'on';
            }
            if (args[0] === 'breadcrumbs.symbolPath') {
                return 'on';
            }
            return super.getValue(...args);
        }
        updateValue() {
            return Promise.resolve();
        }
    })();
    teardown(function () {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('only uri, inside workspace', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/bar/baz/ws/some/path/file.ts'), undefined, configService, workspaceService, new (class extends mock() {
        })());
        const elements = model.getElements();
        assert.strictEqual(elements.length, 3);
        const [one, two, three] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FOLDER);
        assert.strictEqual(three.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/bar/baz/ws/some');
        assert.strictEqual(two.uri.toString(), 'foo:/bar/baz/ws/some/path');
        assert.strictEqual(three.uri.toString(), 'foo:/bar/baz/ws/some/path/file.ts');
    });
    test('display uri matters for FileElement', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/bar/baz/ws/some/PATH/file.ts'), undefined, configService, workspaceService, new (class extends mock() {
        })());
        const elements = model.getElements();
        assert.strictEqual(elements.length, 3);
        const [one, two, three] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FOLDER);
        assert.strictEqual(three.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/bar/baz/ws/some');
        assert.strictEqual(two.uri.toString(), 'foo:/bar/baz/ws/some/PATH');
        assert.strictEqual(three.uri.toString(), 'foo:/bar/baz/ws/some/PATH/file.ts');
    });
    test('only uri, outside workspace', function () {
        model = new BreadcrumbsModel(URI.parse('foo:/outside/file.ts'), undefined, configService, workspaceService, new (class extends mock() {
        })());
        const elements = model.getElements();
        assert.strictEqual(elements.length, 2);
        const [one, two] = elements;
        assert.strictEqual(one.kind, FileKind.FOLDER);
        assert.strictEqual(two.kind, FileKind.FILE);
        assert.strictEqual(one.uri.toString(), 'foo:/outside');
        assert.strictEqual(two.uri.toString(), 'foo:/outside/file.ts');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9icmVhZGNydW1iTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzFGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFDekIsSUFBSSxLQUF1QixDQUFBO0lBQzNCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxrQkFBa0IsQ0FDOUMsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO1FBQ3JCLElBQUksZUFBZSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztLQUNoRixDQUFDLENBQ0YsQ0FB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