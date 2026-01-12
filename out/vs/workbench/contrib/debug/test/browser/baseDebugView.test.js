/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { renderViewTree } from '../../browser/baseDebugView.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
import { isStatusbarInDebugMode } from '../../browser/statusbarColorProvider.js';
import { Expression, Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockSession } from '../common/mockDebug.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel } from './mockDebugModel.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
const $ = dom.$;
suite('Debug - Base Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let renderer;
    let configurationService;
    function assertVariable(session, scope, disposables, displayType) {
        let variable = new Variable(session, 1, scope, 2, 'foo', 'bar.foo', undefined, 0, 0, undefined, {}, 'string');
        let expression = $('.');
        let name = $('.');
        let type = $('.');
        let value = $('.');
        const label = new HighlightedLabel(name);
        const lazyButton = $('.');
        const store = disposables.add(new DisposableStore());
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.strictEqual(label.element.textContent, 'foo');
        assert.strictEqual(value.textContent, '');
        variable.value = 'hey';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.strictEqual(value.textContent, 'hey');
        assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
        assert.strictEqual(type.textContent, displayType ? 'string =' : '');
        variable.value = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.ok(value.querySelector('a'));
        assert.strictEqual(value.querySelector('a').textContent, variable.value);
        variable = new Variable(session, 1, scope, 2, 'console', 'console', '5', 0, 0, undefined, {
            kind: 'virtual',
        });
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.strictEqual(name.className, 'virtual');
        assert.strictEqual(label.element.textContent, 'console =');
        assert.strictEqual(value.className, 'value number');
        variable = new Variable(session, 1, scope, 2, 'xpto', 'xpto.xpto', undefined, 0, 0, undefined, {}, 'custom-type');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.strictEqual(label.element.textContent, 'xpto');
        assert.strictEqual(value.textContent, '');
        variable.value = '2';
        expression = $('.');
        name = $('.');
        type = $('.');
        value = $('.');
        store.add(renderer.renderVariable({ expression, name, type, value, label, lazyButton }, variable, {
            showChanged: false,
        }));
        assert.strictEqual(value.textContent, '2');
        assert.strictEqual(label.element.textContent, displayType ? 'xpto: ' : 'xpto =');
        assert.strictEqual(type.textContent, displayType ? 'custom-type =' : '');
        label.dispose();
    }
    /**
     * Instantiate services for use by the functions being tested.
     */
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        configurationService = instantiationService.createInstance(TestConfigurationService);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IHoverService, NullHoverService);
        renderer = instantiationService.createInstance(DebugExpressionRenderer);
    });
    test('render view tree', () => {
        const container = $('.container');
        const treeContainer = renderViewTree(container);
        assert.strictEqual(treeContainer.className, 'debug-view-content file-icon-themable-tree');
        assert.strictEqual(container.childElementCount, 1);
        assert.strictEqual(container.firstChild, treeContainer);
        assert.strictEqual(dom.isHTMLDivElement(treeContainer), true);
    });
    test('render expression value', () => {
        let container = $('.container');
        const store = disposables.add(new DisposableStore());
        store.add(renderer.renderValue(container, 'render \n me', {}));
        assert.strictEqual(container.className, 'container value');
        assert.strictEqual(container.textContent, 'render \n me');
        const expression = new Expression('console');
        expression.value = 'Object';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value unavailable error');
        expression.available = true;
        expression.value = '"string value"';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value string');
        assert.strictEqual(container.textContent, '"string value"');
        expression.type = 'boolean';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.strictEqual(container.className, 'container value boolean');
        assert.strictEqual(container.textContent, expression.value);
        expression.value = 'this is a long string';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true, maxValueLength: 4 }));
        assert.strictEqual(container.textContent, 'this...');
        expression.value = isWindows ? 'C:\\foo.js:5' : '/foo.js:5';
        container = $('.container');
        store.add(renderer.renderValue(container, expression, { colorize: true }));
        assert.ok(container.querySelector('a'));
        assert.strictEqual(container.querySelector('a').textContent, expression.value);
    });
    test('render variable', () => {
        const session = new MockSession();
        const thread = new Thread(session, 'mockthread', 1);
        const range = {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined,
        };
        const stackFrame = new StackFrame(thread, 1, null, 'app.js', 'normal', range, 0, true);
        const scope = new Scope(stackFrame, 1, 'local', 1, false, 10, 10);
        configurationService.setUserConfiguration('debug.showVariableTypes', false);
        assertVariable(session, scope, disposables, false);
    });
    test('render variable with display type setting', () => {
        const session = new MockSession();
        const thread = new Thread(session, 'mockthread', 1);
        const range = {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: undefined,
            endColumn: undefined,
        };
        const stackFrame = new StackFrame(thread, 1, null, 'app.js', 'normal', range, 0, true);
        const scope = new Scope(stackFrame, 1, 'local', 1, false, 10, 10);
        configurationService.setUserConfiguration('debug.showVariableTypes', true);
        assertVariable(session, scope, disposables, true);
    });
    test('statusbar in debug mode', () => {
        const model = createMockDebugModel(disposables);
        const session = disposables.add(createTestSession(model));
        const session2 = disposables.add(createTestSession(model, undefined, { suppressDebugStatusbar: true }));
        assert.strictEqual(isStatusbarInDebugMode(0 /* State.Inactive */, []), false);
        assert.strictEqual(isStatusbarInDebugMode(1 /* State.Initializing */, [session]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session]), true);
        assert.strictEqual(isStatusbarInDebugMode(2 /* State.Stopped */, [session]), true);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session2]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session, session2]), true);
        session.configuration.noDebug = true;
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session]), false);
        assert.strictEqual(isStatusbarInDebugMode(3 /* State.Running */, [session, session2]), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvYmFzZURlYnVnVmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBRWpHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIs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