/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyCodeChord } from '../../../../../base/common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { organizeImportsCommandId, refactorCommandId } from '../../browser/codeAction.js';
import { CodeActionKeybindingResolver } from '../../browser/codeActionKeybindingResolver.js';
import { CodeActionKind } from '../../common/types.js';
import { ResolvedKeybindingItem } from '../../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
suite('CodeActionKeybindingResolver', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const refactorKeybinding = createCodeActionKeybinding(31 /* KeyCode.KeyA */, refactorCommandId, {
        kind: CodeActionKind.Refactor.value,
    });
    const refactorExtractKeybinding = createCodeActionKeybinding(32 /* KeyCode.KeyB */, refactorCommandId, {
        kind: CodeActionKind.Refactor.append('extract').value,
    });
    const organizeImportsKeybinding = createCodeActionKeybinding(33 /* KeyCode.KeyC */, organizeImportsCommandId, undefined);
    test('Should match refactor keybindings', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([refactorKeybinding])).getResolver();
        assert.strictEqual(resolver({ title: '' }), undefined);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.QuickFix.value }), undefined);
    });
    test('Should prefer most specific keybinding', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([
            refactorKeybinding,
            refactorExtractKeybinding,
            organizeImportsKeybinding,
        ])).getResolver();
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }), refactorExtractKeybinding.resolvedKeybinding);
    });
    test('Organize imports should still return a keybinding even though it does not have args', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([
            refactorKeybinding,
            refactorExtractKeybinding,
            organizeImportsKeybinding,
        ])).getResolver();
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.SourceOrganizeImports.value }), organizeImportsKeybinding.resolvedKeybinding);
    });
});
function createMockKeyBindingService(items) {
    return {
        getKeybindings: () => {
            return items;
        },
    };
}
function createCodeActionKeybinding(keycode, command, commandArgs) {
    return new ResolvedKeybindingItem(new USLayoutResolvedKeybinding([new KeyCodeChord(false, true, false, false, keycode)], 3 /* OperatingSystem.Linux */), command, commandArgs, undefined, false, null, false);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbktleWJpbmRpbmdSZXNvbHZlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi90ZXN0L2Jyb3dzZXIvY29kZUFjdGlvbktleWJpbmRpbmdSZXNvbHZlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFHeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXRELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRXBILEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLGtCQUFrQixHQUFHLDBCQUEwQix3QkFBZSxpQkFBaUIsRUFBRTtRQUN0RixJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLO0tBQ25DLENBQUMsQ0FBQTtJQUVGLE1BQU0seUJBQXlCLEdBQUcsMEJBQTBCLHdCQUFlLGlCQUFpQixFQUFFO1FBQzdGLElBQUksRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLO0tBQ3JELENBQUMsQ0FBQTtJ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