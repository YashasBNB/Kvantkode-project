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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2Jhc2VEZWJ1Z1ZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7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