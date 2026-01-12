/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from './buffer.js';
import { URI } from './uri.js';
export function stringify(obj) {
    return JSON.stringify(obj, replacer);
}
export function parse(text) {
    let data = JSON.parse(text);
    data = revive(data);
    return data;
}
function replacer(key, value) {
    // URI is done via toJSON-member
    if (value instanceof RegExp) {
        return {
            $mid: 2 /* MarshalledId.Regexp */,
            source: value.source,
            flags: value.flags,
        };
    }
    return value;
}
export function revive(obj, depth = 0) {
    if (!obj || depth > 200) {
        return obj;
    }
    if (typeof obj === 'object') {
        switch (obj.$mid) {
            case 1 /* MarshalledId.Uri */:
                return URI.revive(obj);
            case 2 /* MarshalledId.Regexp */:
                return new RegExp(obj.source, obj.flags);
            case 17 /* MarshalledId.Date */:
                return new Date(obj.source);
        }
        if (obj instanceof VSBuffer || obj instanceof Uint8Array) {
            return obj;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; ++i) {
                obj[i] = revive(obj[i], depth + 1);
            }
        }
        else {
            // walk object
            for (const key in obj) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    obj[key] = revive(obj[key], depth + 1);
                }
            }
        }
    }
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyc2hhbGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL21hcnNoYWxsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDdEMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxVQUFVLENBQUE7QUFHN0MsTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFRO0lBQ2pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDckMsQ0FBQztBQUVELE1BQU0sVUFBVSxLQUFLLENBQUMsSUFBWTtJQUNqQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbkIsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBTUQsU0FBUyxRQUFRLENBQUMsR0FBVyxFQUFFLEtBQVU7SUFDeEMsZ0NBQWdDO0lBQ2hDLElBQUksS0FBSyxZQUFZLE1BQU0sRUFBRSxDQUFDO1FBQzdCLE9BQU87WUFDTixJQUFJLDZCQUFxQjtZQUN6QixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1NBQ2xCLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBWUQsTUFBTSxVQUFVLE1BQU0sQ0FBVSxHQUFRLEVBQUUsS0FBSyxHQUFHLENBQUM7SUFDbEQsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDekIsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRUQsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM3QixRQUEyQixHQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEM7Z0JBQ0MsT0FBWSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzVCO2dCQUNDLE9BQVksSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUM7Z0JBQ0MsT0FBWSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUVELElBQUksR0FBRyxZQUFZLFFBQVEsSUFBSSxHQUFHLFlBQVksVUFBVSxFQUFFLENBQUM7WUFDMUQsT0FBWSxHQUFHLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjO1lBQ2QsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN2QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUE7QUFDWCxDQUFDIn0=