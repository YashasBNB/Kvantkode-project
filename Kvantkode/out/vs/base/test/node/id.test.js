/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../node/id.js';
import { getMac } from '../../node/macAddress.js';
import { flakySuite } from './testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
flakySuite('ID', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getMachineId', async function () {
        const errors = [];
        const id = await getMachineId((err) => errors.push(err));
        assert.ok(id);
        assert.strictEqual(errors.length, 0);
    });
    test('getSqmId', async function () {
        const errors = [];
        const id = await getSqmMachineId((err) => errors.push(err));
        assert.ok(typeof id === 'string');
        assert.strictEqual(errors.length, 0);
    });
    test('getdevDeviceId', async function () {
        const errors = [];
        const id = await getdevDeviceId((err) => errors.push(err));
        assert.ok(typeof id === 'string');
        assert.strictEqual(errors.length, 0);
    });
    test('getMac', async () => {
        const macAddress = getMac();
        assert.ok(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress), `Expected a MAC address, got: ${macAddress}`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvaWQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU1RSxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSztRQUN6QixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDakIsTUFBTSxFQUFFLEdBQUcsTUFBTSxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixNQUFNLEVBQUUsR0FBRyxNQUFNLGVBQWUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUs7UUFDM0IsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLE1BQU0sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLE1BQU0sRUFBRSxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxFQUFFLENBQ1IsMkNBQTJDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUM1RCxnQ0FBZ0MsVUFBVSxFQUFFLENBQzVDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=