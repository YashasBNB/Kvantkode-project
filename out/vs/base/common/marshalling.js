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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyc2hhbGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9tYXJzaGFsbGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sVUFBVSxDQUFBO0FBRzdDLE1BQU0sVUFBVSxTQUFTLENBQUMsR0FBUTtJQUNqQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ3JDLENBQUM7QUFFRCxNQUFNLFVBQVUsS0FBSyxDQUFDLElBQVk7SUFDakMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25CLE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQU1ELFNBQVMsUUFBUSxDQUFDLEdBQVcsRUFBRSxLQUFVO0lBQ3hDLGdDQUFnQztJQUNoQyxJQUFJLEtBQUssWUFBWSxNQUFNLEVBQUUsQ0FBQztRQUM3QixPQUFPO1lBQ04sSUFBSSw2QkFBcUI7WUFDekIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztTQUNsQixDQUFBO0lBQ0YsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQVlELE1BQU0sVUFBVSxNQUFNLENBQVUsR0FBUSxFQUFFLEtBQUssR0FBRyxDQUFDO0lBQ2xELElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDN0IsUUFBMkIsR0FBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDO2dCQUNDLE9BQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM1QjtnQkFDQyxPQUFZLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzlDO2dCQUNDLE9BQVksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxJQUFJLEdBQUcsWUFBWSxRQUFRLElBQUksR0FBRyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQzFELE9BQVksR0FBRyxDQUFBO1FBQ2hCLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYztZQUNkLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQyJ9