/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as dom from '../../../../../base/browser/dom.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { WatchExpressionsRenderer } from '../../browser/watchExpressionsView.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { MockDebugService, MockSession } from '../common/mockDebug.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { IDebugService } from '../../common/debug.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { DebugExpressionRenderer } from '../../browser/debugExpressionRenderer.js';
const $ = dom.$;
function assertWatchVariable(disposables, watchExpressionsRenderer, displayType) {
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
    watchExpressionsRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
    node.element.value = 'xpto';
    watchExpressionsRenderer.renderElement(node, 0, data);
    assert.strictEqual(value.textContent, 'xpto');
    assert.strictEqual(type.textContent, displayType ? 'string =' : '');
    assert.strictEqual(label.element.textContent, displayType ? 'foo: ' : 'foo =');
}
suite('Debug - Watch Debug View', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let watchExpressionsRenderer;
    let instantiationService;
    let configurationService;
    let expressionRenderer;
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
    test('watch expressions with display type', () => {
        configurationService.setUserConfiguration('debug', { showVariableTypes: true });
        instantiationService.stub(IConfigurationService, configurationService);
        watchExpressionsRenderer = instantiationService.createInstance(WatchExpressionsRenderer, expressionRenderer);
        assertWatchVariable(disposables, watchExpressionsRenderer, true);
    });
    test('watch expressions', () => {
        configurationService.setUserConfiguration('debug', { showVariableTypes: false });
        instantiationService.stub(IConfigurationService, configurationService);
        watchExpressionsRenderer = instantiationService.createInstance(WatchExpressionsRenderer, expressionRenderer);
        assertWatchVariable(disposables, watchExpressionsRenderer, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hFeHByZXNzaW9uVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL3dhdGNoRXhwcmVzc2lvblZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sdUJBQXVCLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHVCQUF1QixF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