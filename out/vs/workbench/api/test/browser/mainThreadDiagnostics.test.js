/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MarkerService } from '../../../../platform/markers/common/markerService.js';
import { MainThreadDiagnostics } from '../../browser/mainThreadDiagnostics.js';
import { mock } from '../../../test/common/workbenchTestServices.js';
suite('MainThreadDiagnostics', function () {
    let markerService;
    setup(function () {
        markerService = new MarkerService();
    });
    teardown(function () {
        markerService.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('clear markers on dispose', function () {
        const diag = new MainThreadDiagnostics(new (class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) {
                return null;
            }
            getProxy() {
                return {
                    $acceptMarkersChange() { },
                };
            }
            drain() {
                return null;
            }
        })(), markerService, new (class extends mock() {
            asCanonicalUri(uri) {
                return uri;
            }
        })());
        diag.$changeMany('foo', [
            [
                URI.file('a'),
                [
                    {
                        code: '666',
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                        message: 'fffff',
                        severity: 1,
                        source: 'me',
                    },
                ],
            ],
        ]);
        assert.strictEqual(markerService.read().length, 1);
        diag.dispose();
        assert.strictEqual(markerService.read().length, 0);
    });
    test('OnDidChangeDiagnostics triggers twice on same diagnostics #136434', function () {
        return runWithFakedTimers({}, async () => {
            const changedData = [];
            const diag = new MainThreadDiagnostics(new (class {
                constructor() {
                    this.remoteAuthority = '';
                    this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
                }
                dispose() { }
                assertRegistered() { }
                set(v) {
                    return null;
                }
                getProxy() {
                    return {
                        $acceptMarkersChange(data) {
                            changedData.push(data);
                        },
                    };
                }
                drain() {
                    return null;
                }
            })(), markerService, new (class extends mock() {
                asCanonicalUri(uri) {
                    return uri;
                }
            })());
            const markerDataStub = {
                code: '666',
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                severity: 1,
                source: 'me',
            };
            const target = URI.file('a');
            diag.$changeMany('foo', [[target, [{ ...markerDataStub, message: 'same_owner' }]]]);
            markerService.changeOne('bar', target, [{ ...markerDataStub, message: 'forgein_owner' }]);
            // added one marker via the API and one via the ext host. the latter must not
            // trigger an event to the extension host
            await timeout(0);
            assert.strictEqual(markerService.read().length, 2);
            assert.strictEqual(changedData.length, 1);
            assert.strictEqual(changedData[0].length, 1);
            assert.strictEqual(changedData[0][0][1][0].message, 'forgein_owner');
            diag.dispose();
        });
    });
    test('onDidChangeDiagnostics different behavior when "extensionKind" ui running on remote workspace #136955', function () {
        return runWithFakedTimers({}, async () => {
            const markerData = {
                code: '666',
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
                severity: 1,
                source: 'me',
                message: 'message',
            };
            const target = URI.file('a');
            markerService.changeOne('bar', target, [markerData]);
            const changedData = [];
            const diag = new MainThreadDiagnostics(new (class {
                constructor() {
                    this.remoteAuthority = '';
                    this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
                }
                dispose() { }
                assertRegistered() { }
                set(v) {
                    return null;
                }
                getProxy() {
                    return {
                        $acceptMarkersChange(data) {
                            changedData.push(data);
                        },
                    };
                }
                drain() {
                    return null;
                }
            })(), markerService, new (class extends mock() {
                asCanonicalUri(uri) {
                    return uri;
                }
            })());
            diag.$clear('bar');
            await timeout(0);
            assert.strictEqual(markerService.read().length, 0);
            assert.strictEqual(changedData.length, 1);
            diag.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkRGlhZ25vc3RpY3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRzlFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVwRSxLQUFLLENBQUMsdUJBQXVCLEVBQUU7SUFDOUIsSUFBSSxhQUE0QixDQUFBO0lBRWhDLEtBQUssQ0FBQztRQUNMLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDO1FBQ1IsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxxQkFBcUIsQ0FDckMsSUFBSSxDQUFDO1lBQUE7Z0JBQ0osb0JBQWUsR0FBRyxFQUFFLENBQUE7Z0JBQ3BCLHNCQUFpQiwwQ0FB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