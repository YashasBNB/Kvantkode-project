/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
import { VariablesRenderer } from '../../browser/variablesView.js';
import { IDebugService } from '../../common/debug.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockDebugService, MockSession } from '../common/mockDebug.js';
const $ = dom.$;
function assertVariable(disposables, variablesRenderer, displayType) {
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
    const node = {
        element: new Variable(session, 1, scope, 2, 'foo', 'bar.foo', undefined, 0, 0, undefined, {}, 'string'),
        depth: 0,
        visibleChildrenCount: 1,
        visibleChildIndex: -1,
        collapsible: false,
        collapsed: false,
        visible: true,
        filterData: undefined,
        children: [],
    };
    const expression = $('.');
    const name = $('.');
    const type = $('.');
    const value = $('.');
    const label = disposables.add(new HighlightedLabel(name));
    const lazyButton = $('.');
    const inputBoxContainer = $('.');
    const elementDisposable = disposables.add(new DisposableStore());
    const templateDisposable = disposables.add(new DisposableStore());
    const currentElement = undefined;
    const data = {
        expression,
        name,
        type,
        value,
        label,
        lazyButton,
        inputBoxContainer,
        elementDisposable,
        templateDisposable,
        currentElement,
    };
    variablesRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, '');
    assert.strictEqual(label.element.textContent, 'foo');
    node.element.value = 'xpto';
    variablesRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, 'xpto');
    assert.strictEqual(type.textContent, displayType ? 'string =' : '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
    variablesRenderer.disposeTemplate(data);
}
suite('Debug - Variable Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let variablesRenderer;
    let instantiationService;
    let expressionRenderer;
    let configurationService;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        configurationService = instantiationService.createInstance(TestConfigurationService);
        instantiationService.stub(IConfigurationService, configurationService);
        expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
        const debugService = new MockDebugService();
        instantiationService.stub(IHoverService, NullHoverService);
        debugService.getViewModel = () => ({ focusedStackFrame: undefined, getSelectedExpression: () => undefined });
        debugService.getViewModel().getSelectedExpression = () => undefined;
        instantiationService.stub(IDebugService, debugService);
    });
    test('variable expressions with display type', () => {
        configurationService.setUserConfiguration('debug.showVariableTypes', true);
        instantiationService.stub(IConfigurationService, configurationService);
        variablesRenderer = instantiationService.createInstance(VariablesRenderer, expressionRenderer);
        assertVariable(disposables, variablesRenderer, true);
    });
    test('variable expressions', () => {
        configurationService.setUserConfiguration('debug.showVariableTypes', false);
        instantiationService.stub(IConfigurationService, configurationService);
        variablesRenderer = instantiationService.createInstance(VariablesRenderer, expressionRenderer);
        assertVariable(disposables, variablesRenderer, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL3ZhcmlhYmxlc1ZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFakcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBYyxNQUFNLHVCQUF1QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JB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