/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MarkerSeverity } from '../../common/markers.js';
import * as markerService from '../../common/markerService.js';
function randomMarkerData(severity = MarkerSeverity.Error) {
    return {
        severity,
        message: Math.random().toString(16),
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
    };
}
suite('Marker Service', () => {
    let service;
    teardown(function () {
        service.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('query', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [
            {
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(MarkerSeverity.Error),
            },
        ]);
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ resource: URI.parse('file:///c/test/file.cs') }).length, 1);
        assert.strictEqual(service.read({ owner: 'far', resource: URI.parse('file:///c/test/file.cs') }).length, 1);
        service.changeAll('boo', [
            {
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(MarkerSeverity.Warning),
            },
        ]);
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Hint }).length, 0);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error | MarkerSeverity.Warning }).length, 2);
    });
    test('changeOne override', () => {
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        service.changeOne('boo', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        service.changeOne('far', URI.parse('file:///path/only.cs'), [
            randomMarkerData(),
            randomMarkerData(),
        ]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
    });
    test('changeOne/All clears', () => {
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        service.changeOne('boo', URI.parse('file:///path/only.cs'), [randomMarkerData()]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read().length, 2);
        service.changeOne('far', URI.parse('file:///path/only.cs'), []);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 1);
        assert.strictEqual(service.read().length, 1);
        service.changeAll('boo', []);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        assert.strictEqual(service.read({ owner: 'boo' }).length, 0);
        assert.strictEqual(service.read().length, 0);
    });
    test('changeAll sends event for cleared', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [
            {
                resource: URI.parse('file:///d/path'),
                marker: randomMarkerData(),
            },
            {
                resource: URI.parse('file:///d/path'),
                marker: randomMarkerData(),
            },
        ]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        const d = service.onMarkerChanged((changedResources) => {
            assert.strictEqual(changedResources.length, 1);
            changedResources.forEach((u) => assert.strictEqual(u.toString(), 'file:///d/path'));
            assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        });
        service.changeAll('far', []);
        d.dispose();
    });
    test('changeAll merges', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [
            {
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(),
            },
            {
                resource: URI.parse('file:///c/test/file.cs'),
                marker: randomMarkerData(),
            },
        ]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
    });
    test('changeAll must not break integrety, issue #12635', () => {
        service = new markerService.MarkerService();
        service.changeAll('far', [
            {
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData(),
            },
            {
                resource: URI.parse('scheme:path2'),
                marker: randomMarkerData(),
            },
        ]);
        service.changeAll('boo', [
            {
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData(),
            },
        ]);
        service.changeAll('far', [
            {
                resource: URI.parse('scheme:path1'),
                marker: randomMarkerData(),
            },
            {
                resource: URI.parse('scheme:path2'),
                marker: randomMarkerData(),
            },
        ]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 2);
        assert.strictEqual(service.read({ resource: URI.parse('scheme:path1') }).length, 2);
    });
    test('invalid marker data', () => {
        const data = randomMarkerData();
        service = new markerService.MarkerService();
        data.message = undefined;
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        data.message = null;
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 0);
        data.message = 'null';
        service.changeOne('far', URI.parse('some:uri/path'), [data]);
        assert.strictEqual(service.read({ owner: 'far' }).length, 1);
    });
    test('MapMap#remove returns bad values, https://github.com/microsoft/vscode/issues/13548', () => {
        service = new markerService.MarkerService();
        service.changeOne('o', URI.parse('some:uri/1'), [randomMarkerData()]);
        service.changeOne('o', URI.parse('some:uri/2'), []);
    });
    test('Error code of zero in markers get removed, #31275', function () {
        const data = {
            code: '0',
            startLineNumber: 1,
            startColumn: 2,
            endLineNumber: 1,
            endColumn: 5,
            message: 'test',
            severity: 0,
            source: 'me',
        };
        service = new markerService.MarkerService();
        service.changeOne('far', URI.parse('some:thing'), [data]);
        const marker = service.read({ resource: URI.parse('some:thing') });
        assert.strictEqual(marker.length, 1);
        assert.strictEqual(marker[0].code, '0');
    });
    test('resource filter hides markers for the filtered resource', () => {
        service = new markerService.MarkerService();
        const resource1 = URI.parse('file:///path/file1.cs');
        const resource2 = URI.parse('file:///path/file2.cs');
        // Add markers to both resources
        service.changeOne('owner1', resource1, [randomMarkerData()]);
        service.changeOne('owner1', resource2, [randomMarkerData()]);
        // Verify both resources have markers
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource: resource1 }).length, 1);
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
        // Install filter for resource1
        const filter = service.installResourceFilter(resource1, 'Test filter');
        // Verify resource1 markers are filtered out, but have 1 info marker instead
        assert.strictEqual(service.read().length, 2); // 1 real + 1 info
        assert.strictEqual(service.read({ resource: resource1 }).length, 1); // 1 info
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
        // Dispose filter
        filter.dispose();
        // Verify resource1 markers are visible again
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource: resource1 }).length, 1);
        assert.strictEqual(service.read({ resource: resource2 }).length, 1);
    });
    test('resource filter affects all filter combinations', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        service.changeOne('owner1', resource, [randomMarkerData(MarkerSeverity.Error)]);
        service.changeOne('owner2', resource, [randomMarkerData(MarkerSeverity.Warning)]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource }).length, 2);
        assert.strictEqual(service.read({ owner: 'owner1' }).length, 1);
        assert.strictEqual(service.read({ owner: 'owner2' }).length, 1);
        assert.strictEqual(service.read({ owner: 'owner1', resource }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1);
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1);
        // Install filter
        const filter = service.installResourceFilter(resource, 'Filter reason');
        // Verify information marker is shown for resource queries
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ owner: 'owner1' }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ owner: 'owner2' }).length, 1); // 1 info marker
        // Verify owner+resource query returns an info marker for filtered resources
        const ownerResourceMarkers = service.read({ owner: 'owner1', resource });
        assert.strictEqual(ownerResourceMarkers.length, 1);
        assert.strictEqual(ownerResourceMarkers[0].severity, MarkerSeverity.Info);
        assert.strictEqual(ownerResourceMarkers[0].owner, 'markersFilter');
        assert.strictEqual(service.read({ severities: MarkerSeverity.Error }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ severities: MarkerSeverity.Warning }).length, 1); // 1 info marker
        assert.strictEqual(service.read({ severities: MarkerSeverity.Info }).length, 1); // Our info marker
        // Remove filter and verify markers are visible again
        filter.dispose();
        assert.strictEqual(service.read().length, 2);
    });
    test('multiple filters for same resource are handled correctly', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add marker to resource
        service.changeOne('owner1', resource, [randomMarkerData()]);
        // Verify resource has markers
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
        // Install two filters for the same resource
        const filter1 = service.installResourceFilter(resource, 'First filter');
        const filter2 = service.installResourceFilter(resource, 'Second filter');
        // Verify resource markers are filtered out but info marker is shown
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        // Dispose only one filter
        filter1.dispose();
        // Verify resource markers are still filtered out because one filter remains
        assert.strictEqual(service.read().length, 1); // still 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // still 1 info marker
        // Dispose the second filter
        filter2.dispose();
        // Now all filters are gone, so markers should be visible again
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
    });
    test('resource filter with reason shows info marker when markers are filtered', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add error and warning to the resource
        service.changeOne('owner1', resource, [
            randomMarkerData(MarkerSeverity.Error),
            randomMarkerData(MarkerSeverity.Warning),
        ]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        assert.strictEqual(service.read({ resource }).length, 2);
        // Apply a filter with reason
        const filterReason = 'Test filter reason';
        const filter = service.installResourceFilter(resource, filterReason);
        // Verify that we get a single info marker with our reason
        const markers = service.read({ resource });
        assert.strictEqual(markers.length, 1);
        assert.strictEqual(markers[0].severity, MarkerSeverity.Info);
        assert.ok(markers[0].message.includes(filterReason));
        // Remove filter and verify the original markers are back
        filter.dispose();
        assert.strictEqual(service.read({ resource }).length, 2);
    });
    test('reading all markers shows info marker for filtered resources', () => {
        service = new markerService.MarkerService();
        const resource1 = URI.parse('file:///path/file1.cs');
        const resource2 = URI.parse('file:///path/file2.cs');
        // Add markers to both resources
        service.changeOne('owner1', resource1, [randomMarkerData()]);
        service.changeOne('owner1', resource2, [randomMarkerData()]);
        // Verify initial state
        assert.strictEqual(service.read().length, 2);
        // Filter one resource with a reason
        const filterReason = 'Resource is being edited';
        const filter = service.installResourceFilter(resource1, filterReason);
        // Read all markers
        const allMarkers = service.read();
        // Should have 2 markers - one real marker and one info marker
        assert.strictEqual(allMarkers.length, 2);
        // Find the info marker
        const infoMarker = allMarkers.find((marker) => marker.owner === 'markersFilter' && marker.severity === MarkerSeverity.Info);
        // Verify the info marker
        assert.ok(infoMarker);
        assert.strictEqual(infoMarker?.resource.toString(), resource1.toString());
        assert.ok(infoMarker?.message.includes(filterReason));
        // Remove filter
        filter.dispose();
    });
    test('out of order filter disposal works correctly', () => {
        service = new markerService.MarkerService();
        const resource = URI.parse('file:///path/file.cs');
        // Add marker to resource
        service.changeOne('owner1', resource, [randomMarkerData()]);
        // Verify resource has markers
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
        // Install three filters for the same resource
        const filter1 = service.installResourceFilter(resource, 'First filter');
        const filter2 = service.installResourceFilter(resource, 'Second filter');
        const filter3 = service.installResourceFilter(resource, 'Third filter');
        // Verify resource markers are filtered out but info marker is shown
        assert.strictEqual(service.read().length, 1); // 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // 1 info marker
        // Dispose filters in a different order than they were created
        filter2.dispose(); // Remove the second filter first
        // Verify resource markers are still filtered out with 2 filters remaining
        assert.strictEqual(service.read().length, 1); // still 1 info marker
        assert.strictEqual(service.read({ resource }).length, 1); // still 1 info marker
        // Check if message contains the correct count of filters
        const markers = service.read({ resource });
        assert.ok(markers[0].message.includes('Problems are paused because'));
        // Remove remaining filters in any order
        filter3.dispose();
        filter1.dispose();
        // Now all filters are gone, so markers should be visible again
        assert.strictEqual(service.read().length, 1);
        assert.strictEqual(service.read({ resource }).length, 1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tYXJrZXJzL3Rlc3QvY29tbW9uL21hcmtlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRSxPQUFPLEtBQUssYUFBYSxNQUFNLCtCQUErQixDQUFBO0FBRTlELFNBQVMsZ0JBQWdCLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxLQUFLO0lBQ3hELE9BQU87UUFDTixRQUFRO1FBQ1IsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ25DLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLFdBQVcsRUFBRSxDQUFDO1FBQ2QsYUFBYSxFQUFFLENBQUM7UUFDaEIsU0FBUyxFQUFFLENBQUM7S0FDWixDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsSUFBSSxPQUFvQyxDQUFBO0lBRXhDLFFBQVEsQ0FBQztRQUNSLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsT0FBTyxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBRTND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