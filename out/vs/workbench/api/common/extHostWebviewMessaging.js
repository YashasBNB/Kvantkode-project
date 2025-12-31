/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
class ArrayBufferSet {
    constructor() {
        this.buffers = [];
    }
    add(buffer) {
        let index = this.buffers.indexOf(buffer);
        if (index < 0) {
            index = this.buffers.length;
            this.buffers.push(buffer);
        }
        return index;
    }
}
export function serializeWebviewMessage(message, options) {
    if (options.serializeBuffersForPostMessage) {
        // Extract all ArrayBuffers from the message and replace them with references.
        const arrayBuffers = new ArrayBufferSet();
        const replacer = (_key, value) => {
            if (value instanceof ArrayBuffer) {
                const index = arrayBuffers.add(value);
                return {
                    $$vscode_array_buffer_reference$$: true,
                    index,
                };
            }
            else if (ArrayBuffer.isView(value)) {
                const type = getTypedArrayType(value);
                if (type) {
                    const index = arrayBuffers.add(value.buffer);
                    return {
                        $$vscode_array_buffer_reference$$: true,
                        index,
                        view: {
                            type: type,
                            byteLength: value.byteLength,
                            byteOffset: value.byteOffset,
                        },
                    };
                }
            }
            return value;
        };
        const serializedMessage = JSON.stringify(message, replacer);
        const buffers = arrayBuffers.buffers.map((arrayBuffer) => {
            const bytes = new Uint8Array(arrayBuffer);
            return VSBuffer.wrap(bytes);
        });
        return { message: serializedMessage, buffers };
    }
    else {
        return { message: JSON.stringify(message), buffers: [] };
    }
}
function getTypedArrayType(value) {
    switch (value.constructor.name) {
        case 'Int8Array':
            return 1 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int8Array */;
        case 'Uint8Array':
            return 2 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8Array */;
        case 'Uint8ClampedArray':
            return 3 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8ClampedArray */;
        case 'Int16Array':
            return 4 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int16Array */;
        case 'Uint16Array':
            return 5 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint16Array */;
        case 'Int32Array':
            return 6 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int32Array */;
        case 'Uint32Array':
            return 7 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint32Array */;
        case 'Float32Array':
            return 8 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float32Array */;
        case 'Float64Array':
            return 9 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float64Array */;
        case 'BigInt64Array':
            return 10 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigInt64Array */;
        case 'BigUint64Array':
            return 11 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigUint64Array */;
    }
    return undefined;
}
export function deserializeWebviewMessage(jsonMessage, buffers) {
    const arrayBuffers = buffers.map((buffer) => {
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        const uint8Array = new Uint8Array(arrayBuffer);
        uint8Array.set(buffer.buffer);
        return arrayBuffer;
    });
    const reviver = !buffers.length
        ? undefined
        : (_key, value) => {
            if (value &&
                typeof value === 'object' &&
                value
                    .$$vscode_array_buffer_reference$$) {
                const ref = value;
                const { index } = ref;
                const arrayBuffer = arrayBuffers[index];
                if (ref.view) {
                    switch (ref.view.type) {
                        case 1 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int8Array */:
                            return new Int8Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int8Array.BYTES_PER_ELEMENT);
                        case 2 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8Array */:
                            return new Uint8Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint8Array.BYTES_PER_ELEMENT);
                        case 3 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint8ClampedArray */:
                            return new Uint8ClampedArray(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint8ClampedArray.BYTES_PER_ELEMENT);
                        case 4 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int16Array */:
                            return new Int16Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int16Array.BYTES_PER_ELEMENT);
                        case 5 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint16Array */:
                            return new Uint16Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint16Array.BYTES_PER_ELEMENT);
                        case 6 /* extHostProtocol.WebviewMessageArrayBufferViewType.Int32Array */:
                            return new Int32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Int32Array.BYTES_PER_ELEMENT);
                        case 7 /* extHostProtocol.WebviewMessageArrayBufferViewType.Uint32Array */:
                            return new Uint32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Uint32Array.BYTES_PER_ELEMENT);
                        case 8 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float32Array */:
                            return new Float32Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Float32Array.BYTES_PER_ELEMENT);
                        case 9 /* extHostProtocol.WebviewMessageArrayBufferViewType.Float64Array */:
                            return new Float64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / Float64Array.BYTES_PER_ELEMENT);
                        case 10 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigInt64Array */:
                            return new BigInt64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / BigInt64Array.BYTES_PER_ELEMENT);
                        case 11 /* extHostProtocol.WebviewMessageArrayBufferViewType.BigUint64Array */:
                            return new BigUint64Array(arrayBuffer, ref.view.byteOffset, ref.view.byteLength / BigUint64Array.BYTES_PER_ELEMENT);
                        default:
                            throw new Error('Unknown array buffer view type');
                    }
                }
                return arrayBuffer;
            }
            return value;
        };
    const message = JSON.parse(jsonMessage, reviver);
    return { message, arrayBuffers };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdNZXNzYWdpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2Vidmlld01lc3NhZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHekQsTUFBTSxjQUFjO0lBQXBCO1FBQ2lCLFlBQU8sR0FBa0IsRUFBRSxDQUFBO0lBVTVDLENBQUM7SUFSTyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7WUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxPQUFZLEVBQ1osT0FBcUQ7SUFFckQsSUFBSSxPQUFPLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUM1Qyw4RUFBOEU7UUFDOUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUV6QyxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxLQUFVLEVBQUUsRUFBRTtZQUM3QyxJQUFJLEtBQUssWUFBWSxXQUFXLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDckMsT0FBTztvQkFDTixpQ0FBaUMsRUFBRSxJQUFJO29CQUN2QyxLQUFLO2lCQUN3RCxDQUFBO1lBQy9ELENBQUM7aUJBQU0sSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUM1QyxPQUFPO3dCQUNOLGlDQUFpQyxFQUFFLElBQUk7d0JBQ3ZDLEtBQUs7d0JBQ0wsSUFBSSxFQUFFOzRCQUNMLElBQUksRUFBRSxJQUFJOzRCQUNWLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTs0QkFDNUIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO3lCQUM1QjtxQkFDNEQsQ0FBQTtnQkFDL0QsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQTtRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFM0QsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUN6QyxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQy9DLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQTtJQUN6RCxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQ3pCLEtBQXNCO0lBRXRCLFFBQVEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQyxLQUFLLFdBQVc7WUFDZiwyRUFBa0U7UUFDbkUsS0FBSyxZQUFZO1lBQ2hCLDRFQUFtRTtRQUNwRSxLQUFLLG1CQUFtQjtZQUN2QixtRkFBMEU7UUFDM0UsS0FBSyxZQUFZO1lBQ2hCLDRFQUFtRTtRQUNwRSxLQUFLLGFBQWE7WUFDakIsNkVBQW9FO1FBQ3JFLEtBQUssWUFBWTtZQUNoQiw0RUFBbUU7UUFDcEUsS0FBSyxhQUFhO1lBQ2pCLDZFQUFvRTtRQUNyRSxLQUFLLGNBQWM7WUFDbEIsOEVBQXFFO1FBQ3RFLEtBQUssY0FBYztZQUNsQiw4RUFBcUU7UUFDdEUsS0FBSyxlQUFlO1lBQ25CLGdGQUFzRTtRQUN2RSxLQUFLLGdCQUFnQjtZQUNwQixpRkFBdUU7SUFDekUsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLFdBQW1CLEVBQ25CLE9BQW1CO0lBRW5CLE1BQU0sWUFBWSxHQUFrQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDMUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzlDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTTtRQUM5QixDQUFDLENBQUMsU0FBUztRQUNYLENBQUMsQ0FBQyxDQUFDLElBQVksRUFBRSxLQUFVLEVBQUUsRUFBRTtZQUM3QixJQUNDLEtBQUs7Z0JBQ0wsT0FBTyxLQUFLLEtBQUssUUFBUTtnQkFDeEIsS0FBNEQ7cUJBQzNELGlDQUFpQyxFQUNsQyxDQUFDO2dCQUNGLE1BQU0sR0FBRyxHQUFHLEtBQTJELENBQUE7Z0JBQ3ZFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxHQUFHLENBQUE7Z0JBQ3JCLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdkMsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2QsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUN2Qjs0QkFDQyxPQUFPLElBQUksU0FBUyxDQUNuQixXQUFXLEVBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FDakQsQ0FBQTt3QkFDRjs0QkFDQyxPQUFPLElBQUksVUFBVSxDQUNwQixXQUFXLEVBQ1gsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FDbEQsQ0FBQTt3QkFDRjs0QkFDQyxPQUFPLElBQUksaUJBQWlCLENBQzNCLFdBQVcsRUFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQ3pELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFVBQVUsQ0FDcEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQ2xELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFdBQVcsQ0FDckIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQ25ELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFVBQVUsQ0FDcEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQ2xELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFdBQVcsQ0FDckIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQ25ELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFlBQVksQ0FDdEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQ3BELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLFlBQVksQ0FDdEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQ3BELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLGFBQWEsQ0FDdkIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQ3JELENBQUE7d0JBQ0Y7NEJBQ0MsT0FBTyxJQUFJLGNBQWMsQ0FDeEIsV0FBVyxFQUNYLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQ3RELENBQUE7d0JBQ0Y7NEJBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO29CQUNuRCxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxXQUFXLENBQUE7WUFDbkIsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFBO0lBRUgsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsQ0FBQTtBQUNqQyxDQUFDIn0=