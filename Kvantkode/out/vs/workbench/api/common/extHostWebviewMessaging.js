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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdNZXNzYWdpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXZWJ2aWV3TWVzc2FnaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUd6RCxNQUFNLGNBQWM7SUFBcEI7UUFDaUIsWUFBTyxHQUFrQixFQUFFLENBQUE7SUFVNUMsQ0FBQztJQVJPLEdBQUcsQ0FBQyxNQUFtQjtRQUM3QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLE9BQVksRUFDWixPQUFxRDtJQUVyRCxJQUFJLE9BQU8sQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1FBQzVDLDhFQUE4RTtRQUM5RSxNQUFNLFlBQVksR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBRXpDLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLEtBQVUsRUFBRSxFQUFFO1lBQzdDLElBQUksS0FBSyxZQUFZLFdBQVcsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyQyxPQUFPO29CQUNOLGlDQUFpQyxFQUFFLElBQUk7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