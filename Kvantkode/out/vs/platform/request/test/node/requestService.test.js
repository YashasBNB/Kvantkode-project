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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC90ZXN0L25vZGUvcmVxdWVzdFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBR3REO0lBQUEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELElBQUksQ0FBQztZQUNKLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sMkJBQTJCLENBQ2pELHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLHdCQUF3QixDQUN4QixDQUFBO1lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE1BQU0sQ0FBQyxFQUFFLENBQ1IsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsb0RBQW9ELENBQUM7Z0JBQzNFLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxDQUFDO2dCQUMzRCxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzREFBc0QsQ0FBQztnQkFDOUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFDNUMscUJBQXFCLEdBQUcsRUFBRSxDQUMxQixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==