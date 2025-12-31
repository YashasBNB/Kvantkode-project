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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3REb2N1bWVudHNBbmRFZGl0b3JzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsSUFBSSxPQUFtQyxDQUFBO0lBRXZDLEtBQUssQ0FBQztRQUNMLE9BQU8sR0FBRyxJQUFJLDBCQUEwQixDQUFDLElBQUksZUFBZSxFQUFFLEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsd0ZBQXdGLEVBQUUsR0FBRyxFQUFFO1FBQ25HLE9BQU8sQ0FBQywrQkFBK0IsQ0FBQztZQUN2QyxjQUFjLEVBQUU7Z0JBQ2Y7b0JBQ0MsR0FBRyxFQUFFLElBQUk7b0JBQ1QsT0FBTyxFQUFFLElBQUk7b0JBQ2IsVUFBVSxFQUFFLFNBQVM7b0JBQ3JCLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztvQkFDekIsU0FBUyxFQUFFLENBQUM7b0JBQ1osS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztvQkFDMUIsUUFBUSxFQUFFLE1BQU07aUJBQ2hCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM1QyxJQUFJLENBQUM7b0JBQ0osS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDakQsQ0FBQztvQkFDRCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ25CLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ1YsQ0FBQzt3QkFBUyxDQUFDO29CQUNWLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRixPQUFPLENBQUMsK0JBQStCLENBQUM7Z0JBQ3ZDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN4QyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==