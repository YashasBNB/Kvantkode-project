/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostDocumentsAndEditors', () => {
    let editors;
    setup(function () {
        editors = new ExtHostDocumentsAndEditors(new TestRPCProtocol(), new NullLogService());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('The value of TextDocument.isClosed is incorrect when a text document is closed, #27949', () => {
        editors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    EOL: '\n',
                    isDirty: true,
                    languageId: 'fooLang',
                    uri: URI.parse('foo:bar'),
                    versionId: 1,
                    lines: ['first', 'second'],
                    encoding: 'utf8',
                },
            ],
        });
        return new Promise((resolve, reject) => {
            const d = editors.onDidRemoveDocuments((e) => {
                try {
                    for (const data of e) {
                        assert.strictEqual(data.document.isClosed, true);
                    }
                    resolve(undefined);
                }
                catch (e) {
                    reject(e);
                }
                finally {
                    d.dispose();
                }
            });
            editors.$acceptDocumentsAndEditorsDelta({
                removedDocuments: [URI.parse('foo:bar')],
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4QyxJQUFJLE9BQW1DLENBQUE7SUFFdkMsS0FBSyxDQUFDO1FBQ0wsT0FBTyxHQUFHLElBQUksMEJBQTBCLENBQUMsSUFBSSxlQUFlLEVBQUUsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUE7SUFDdEYsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx3RkFBd0YsRUFBRSxHQUFHLEVBQUU7UUFDbkcsT0FBTyxDQUFDLCtCQUErQixDQUFDO1lBQ3ZDLGNBQWMsRUFBRTtnQkFDZjtvQkFDQyxHQUFHLEVBQUUsSUFBSTtvQkFDVCxPQUFPLEVBQUUsSUFBSTtvQkFDYixVQUFVLEVBQUUsU0FBUztvQkFDckIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO29CQUN6QixTQUFTLEVBQUUsQ0FBQztvQkFDWixLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO29CQUMxQixRQUFRLEVBQUUsTUFBTTtpQkFDaEI7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVDLElBQUksQ0FBQztvQkFDSixLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO29CQUNqRCxDQUFDO29CQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNaLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDVixDQUFDO3dCQUFTLENBQUM7b0JBQ1YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNaLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVGLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQztnQkFDdkMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3hDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9