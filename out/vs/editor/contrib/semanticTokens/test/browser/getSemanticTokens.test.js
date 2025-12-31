/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { canceled } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { getDocumentSemanticTokens } from '../../common/getSemanticTokens.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
suite('getSemanticTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #136540: semantic highlighting flickers', async () => {
        const disposables = new DisposableStore();
        const registry = new LanguageFeatureRegistry();
        const provider = new (class {
            getLegend() {
                return { tokenTypes: ['test'], tokenModifiers: [] };
            }
            provideDocumentSemanticTokens(model, lastResultId, token) {
                throw canceled();
            }
            releaseDocumentSemanticTokens(resultId) { }
        })();
        disposables.add(registry.register('testLang', provider));
        const textModel = disposables.add(createTextModel('example', 'testLang'));
        await getDocumentSemanticTokens(registry, textModel, null, null, CancellationToken.None).then((res) => {
            assert.fail();
        }, (err) => {
            assert.ok(!!err);
        });
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlbWFudGljVG9rZW5zL3Rlc3QvYnJvd3Nlci9nZXRTZW1hbnRpY1Rva2Vucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBU3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUxRSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSx1QkFBdUIsRUFBa0MsQ0FBQTtRQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsU0FBUztnQkFDUixPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxDQUFBO1lBQ3BELENBQUM7WUFDRCw2QkFBNkIsQ0FDNUIsS0FBaUIsRUFDakIsWUFBMkIsRUFDM0IsS0FBd0I7Z0JBRXhCLE1BQU0sUUFBUSxFQUFFLENBQUE7WUFDakIsQ0FBQztZQUNELDZCQUE2QixDQUFDLFFBQTRCLElBQVMsQ0FBQztTQUNwRSxDQUFDLEVBQUUsQ0FBQTtRQUVKLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUV4RCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUV6RSxNQUFNLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQzVGLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDUCxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDZCxDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLENBQUMsQ0FDRCxDQUFBO1FBRUQsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==