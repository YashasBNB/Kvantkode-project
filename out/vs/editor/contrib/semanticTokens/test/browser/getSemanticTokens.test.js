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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvdGVzdC9icm93c2VyL2dldFNlbWFudGljVG9rZW5zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFTdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTFFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUF1QixFQUFrQyxDQUFBO1FBQzlFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztZQUNyQixTQUFTO2dCQUNSLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLENBQUE7WUFDcEQsQ0FBQztZQUNELDZCQUE2QixDQUM1QixLQUFpQixFQUNqQixZQUEyQixFQUMzQixLQUF3QjtnQkFFeEIsTUFBTSxRQUFRLEVBQUUsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsNkJBQTZCLENBQUMsUUFBNEIsSUFBUyxDQUFDO1NBQ3BFLENBQUMsRUFBRSxDQUFBO1FBRUosV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRXhELE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRXpFLE1BQU0seUJBQXlCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDNUYsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNQLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNkLENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ1AsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakIsQ0FBQyxDQUNELENBQUE7UUFFRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9