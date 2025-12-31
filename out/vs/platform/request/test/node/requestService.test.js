/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { lookupKerberosAuthorization } from '../../node/requestService.js';
import { isWindows } from '../../../../base/common/platform.js';
suite('Request Service', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    (isWindows ? test : test.skip)('Kerberos lookup', async () => {
        try {
            const logService = store.add(new NullLogService());
            const response = await lookupKerberosAuthorization('http://localhost:9999', undefined, logService, 'requestService.test.ts');
            assert.ok(response);
        }
        catch (err) {
            assert.ok(err?.message?.includes('No authority could be contacted for authentication') ||
                err?.message?.includes('No Kerberos credentials available') ||
                err?.message?.includes('No credentials are available in the security package') ||
                err?.message?.includes('no credential for'), `Unexpected error: ${err}`);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlcXVlc3QvdGVzdC9ub2RlL3JlcXVlc3RTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUd0RDtJQUFBLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQTtZQUNsRCxNQUFNLFFBQVEsR0FBRyxNQUFNLDJCQUEyQixDQUNqRCx1QkFBdUIsRUFDdkIsU0FBUyxFQUNULFVBQVUsRUFDVix3QkFBd0IsQ0FDeEIsQ0FBQTtZQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxNQUFNLENBQUMsRUFBRSxDQUNSLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG9EQUFvRCxDQUFDO2dCQUMzRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsQ0FBQztnQkFDM0QsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsc0RBQXNELENBQUM7Z0JBQzlFLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQzVDLHFCQUFxQixHQUFHLEVBQUUsQ0FDMUIsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=