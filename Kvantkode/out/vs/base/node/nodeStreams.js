/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Transform } from 'stream';
import { binaryIndexOf } from '../common/buffer.js';
/**
 * A Transform stream that splits the input on the "splitter" substring.
 * The resulting chunks will contain (and trail with) the splitter match.
 * The last chunk when the stream ends will be emitted even if a splitter
 * is not encountered.
 */
export class StreamSplitter extends Transform {
    constructor(splitter) {
        super();
        if (typeof splitter === 'number') {
            this.splitter = splitter;
            this.spitterLen = 1;
        }
        else {
            const buf = Buffer.isBuffer(splitter) ? splitter : Buffer.from(splitter);
            this.splitter = buf.length === 1 ? buf[0] : buf;
            this.spitterLen = buf.length;
        }
    }
    _transform(chunk, _encoding, callback) {
        if (!this.buffer) {
            this.buffer = chunk;
        }
        else {
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        let offset = 0;
        while (offset < this.buffer.length) {
            const index = typeof this.splitter === 'number'
                ? this.buffer.indexOf(this.splitter, offset)
                : binaryIndexOf(this.buffer, this.splitter, offset);
            if (index === -1) {
                break;
            }
            this.push(this.buffer.slice(offset, index + this.spitterLen));
            offset = index + this.spitterLen;
        }
        this.buffer = offset === this.buffer.length ? undefined : this.buffer.slice(offset);
        callback();
    }
    _flush(callback) {
        if (this.buffer) {
            this.push(this.buffer);
        }
        callback();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVN0cmVhbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9ub2RlU3RyZWFtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVuRDs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxjQUFlLFNBQVEsU0FBUztJQUs1QyxZQUFZLFFBQWtDO1FBQzdDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtZQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNwQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtZQUMvQyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFUSxVQUFVLENBQ2xCLEtBQWEsRUFDYixTQUFpQixFQUNqQixRQUFvRDtRQUVwRCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDZCxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLE1BQU0sS0FBSyxHQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRO2dCQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3JELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE1BQUs7WUFDTixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBQzdELE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkYsUUFBUSxFQUFFLENBQUE7SUFDWCxDQUFDO0lBRVEsTUFBTSxDQUFDLFFBQW9EO1FBQ25FLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxRQUFRLEVBQUUsQ0FBQTtJQUNYLENBQUM7Q0FDRCJ9