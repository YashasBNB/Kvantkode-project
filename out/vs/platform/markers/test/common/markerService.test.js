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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWFya2Vycy90ZXN0L2NvbW1vbi9tYXJrZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckUsT0FBTyxLQUFLLGFBQWEsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxTQUFTLGdCQUFnQixDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsS0FBSztJQUN4RCxPQUFPO1FBQ04sUUFBUTtRQUNSLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUNuQyxlQUFlLEVBQUUsQ0FBQztRQUNsQixXQUFXLEVBQUUsQ0FBQztRQUNkLGFBQWEsRUFBRSxDQUFDO1FBQ2hCLFNBQVMsRUFBRSxDQUFDO0tBQ1osQ0FBQTtBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksT0FBb0MsQ0FBQTtJQUV4QyxRQUFRLENBQUM7UUFDUixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE9BQU8sR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUUzQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtB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