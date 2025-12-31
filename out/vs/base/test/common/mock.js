/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stub } from 'sinon';
export function mock() {
    return function () { };
}
// Creates an object object that returns sinon mocks for every property. Optionally
// takes base properties.
export const mockObject = () => (properties) => {
    return new Proxy({ ...properties }, {
        get(target, key) {
            if (!target.hasOwnProperty(key)) {
                target[key] = stub();
            }
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            return true;
        },
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbW9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWEsSUFBSSxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBTXZDLE1BQU0sVUFBVSxJQUFJO0lBQ25CLE9BQU8sY0FBYSxDQUFRLENBQUE7QUFDN0IsQ0FBQztBQU1ELG1GQUFtRjtBQUNuRix5QkFBeUI7QUFDekIsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUN0QixHQUFxQixFQUFFLENBQ3ZCLENBQTZCLFVBQWUsRUFBMkIsRUFBRTtJQUN4RSxPQUFPLElBQUksS0FBSyxDQUFDLEVBQUUsR0FBRyxVQUFVLEVBQVMsRUFBRTtRQUMxQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUc7WUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUE7WUFDckIsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLENBQUM7UUFDRCxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLO1lBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7WUFDbkIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFBIn0=