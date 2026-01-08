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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERpYWdub3N0aWNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWREaWFnbm9zdGljcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHOUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXBFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRTtJQUM5QixJQUFJLGFBQTRCLENBQUE7SUFFaEMsS0FBSyxDQUFDO1FBQ0wsYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUM7UUFDUixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDeEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyxNQUFNLElBQUksR0FBRyxJQUFJLHFCQUFxQixDQUNyQyxJQUFJLENBQUM7WUFBQTtnQkFDSixvQkFBZSxHQUFHLEVBQUUsQ0FBQTtnQkFDcEIsc0JBQWlCLDBDQUFpQztZQWNuRCxDQUFDO1lBYkEsT0FBTyxLQUFJLENBQUM7WUFDWixnQkFBZ0IsS0FBSSxDQUFDO1lBQ3JCLEdBQUcsQ0FBQyxDQUFNO2dCQUNULE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELFFBQVE7Z0JBQ1AsT0FBTztvQkFDTixvQkFBb0IsS0FBSSxDQUFDO2lCQUN6QixDQUFBO1lBQ0YsQ0FBQztZQUNELEtBQUs7Z0JBQ0osT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQyxFQUFFLEVBQ0osYUFBYSxFQUNiLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUF1QjtZQUNwQyxjQUFjLENBQUMsR0FBUTtnQkFDL0IsT0FBTyxHQUFHLENBQUE7WUFDWCxDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO1lBQ3ZCO2dCQUNDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNiO29CQUNDO3dCQUNDLElBQUksRUFBRSxLQUFLO3dCQUNYLGVBQWUsRUFBRSxDQUFDO3dCQUNsQixXQUFXLEVBQUUsQ0FBQzt3QkFDZCxhQUFhLEVBQUUsQ0FBQzt3QkFDaEIsU0FBUyxFQUFFLENBQUM7d0JBQ1osT0FBTyxFQUFFLE9BQU87d0JBQ2hCLFFBQVEsRUFBRSxDQUFDO3dCQUNYLE1BQU0sRUFBRSxJQUFJO3FCQUNaO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1FQUFtRSxFQUFFO1FBQ3pFLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hDLE1BQU0sV0FBVyxHQUF1QyxFQUFFLENBQUE7WUFFMUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxxQkFBcUIsQ0FDckMsSUFBSSxDQUFDO2dCQUFBO29CQUNKLG9CQUFlLEdBQUcsRUFBRSxDQUFBO29CQUNwQixzQkFBaUIsMENBQWlDO2dCQWdCbkQsQ0FBQztnQkFmQSxPQUFPLEtBQUksQ0FBQztnQkFDWixnQkFBZ0IsS0FBSSxDQUFDO2dCQUNyQixHQUFHLENBQUMsQ0FBTTtvQkFDVCxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUNELFFBQVE7b0JBQ1AsT0FBTzt3QkFDTixvQkFBb0IsQ0FBQyxJQUFzQzs0QkFDMUQsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDdkIsQ0FBQztxQkFDRCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSztvQkFDSixPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2FBQ0QsQ0FBQyxFQUFFLEVBQ0osYUFBYSxFQUNiLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUF1QjtnQkFDcEMsY0FBYyxDQUFDLEdBQVE7b0JBQy9CLE9BQU8sR0FBRyxDQUFBO2dCQUNYLENBQUM7YUFDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1lBRUQsTUFBTSxjQUFjLEdBQUc7Z0JBQ3RCLElBQUksRUFBRSxLQUFLO2dCQUNYLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixXQUFXLEVBQUUsQ0FBQztnQkFDZCxhQUFhLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxFQUFFLENBQUM7Z0JBQ1osUUFBUSxFQUFFLENBQUM7Z0JBQ1gsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFBO1lBQ0QsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuRixhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsY0FBYyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFekYsNkVBQTZFO1lBQzdFLHlDQUF5QztZQUV6QyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFFcEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1R0FBdUcsRUFBRTtRQUM3RyxPQUFPLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4QyxNQUFNLFVBQVUsR0FBZ0I7Z0JBQy9CLElBQUksRUFBRSxLQUFLO2dCQUNYLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixXQUFXLEVBQUUsQ0FBQztnQkFDZCxhQUFhLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxFQUFFLENBQUM7Z0JBQ1osUUFBUSxFQUFFLENBQUM7Z0JBQ1gsTUFBTSxFQUFFLElBQUk7Z0JBQ1osT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtZQUVwRCxNQUFNLFdBQVcsR0FBdUMsRUFBRSxDQUFBO1lBRTFELE1BQU0sSUFBSSxHQUFHLElBQUkscUJBQXFCLENBQ3JDLElBQUksQ0FBQztnQkFBQTtvQkFDSixvQkFBZSxHQUFHLEVBQUUsQ0FBQTtvQkFDcEIsc0JBQWlCLDBDQUFpQztnQkFnQm5ELENBQUM7Z0JBZkEsT0FBTyxLQUFJLENBQUM7Z0JBQ1osZ0JBQWdCLEtBQUksQ0FBQztnQkFDckIsR0FBRyxDQUFDLENBQU07b0JBQ1QsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxRQUFRO29CQUNQLE9BQU87d0JBQ04sb0JBQW9CLENBQUMsSUFBc0M7NEJBQzFELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ3ZCLENBQUM7cUJBQ0QsQ0FBQTtnQkFDRixDQUFDO2dCQUNELEtBQUs7b0JBQ0osT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQzthQUNELENBQUMsRUFBRSxFQUNKLGFBQWEsRUFDYixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBdUI7Z0JBQ3BDLGNBQWMsQ0FBQyxHQUFRO29CQUMvQixPQUFPLEdBQUcsQ0FBQTtnQkFDWCxDQUFDO2FBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV6QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==