/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Writable } from 'stream';
import assert from 'assert';
import { StreamSplitter } from '../../node/nodeStreams.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('StreamSplitter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should split a stream on a single character splitter', (done) => {
        const chunks = [];
        const splitter = new StreamSplitter('\n');
        const writable = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk.toString());
                callback();
            },
        });
        splitter.pipe(writable);
        splitter.write('hello\nwor');
        splitter.write('ld\n');
        splitter.write('foo\nbar\nz');
        splitter.end(() => {
            assert.deepStrictEqual(chunks, ['hello\n', 'world\n', 'foo\n', 'bar\n', 'z']);
            done();
        });
    });
    test('should split a stream on a multi-character splitter', (done) => {
        const chunks = [];
        const splitter = new StreamSplitter('---');
        const writable = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(chunk.toString());
                callback();
            },
        });
        splitter.pipe(writable);
        splitter.write('hello---wor');
        splitter.write('ld---');
        splitter.write('foo---bar---z');
        splitter.end(() => {
            assert.deepStrictEqual(chunks, ['hello---', 'world---', 'foo---', 'bar---', 'z']);
            done();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVN0cmVhbXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL25vZGVTdHJlYW1zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNqQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsc0RBQXNELEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNyRSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUM7WUFDN0IsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsUUFBUTtnQkFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDN0IsUUFBUSxFQUFFLENBQUE7WUFDWCxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2QixRQUFRLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzVCLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtZQUNqQixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzdFLElBQUksRUFBRSxDQUFBO1FBQ1AsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3BFLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQztZQUM3QixLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxRQUFRO2dCQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUM3QixRQUFRLEVBQUUsQ0FBQTtZQUNYLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZCLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDN0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QixRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQy9CLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ2pCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDakYsSUFBSSxFQUFFLENBQUE7UUFDUCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==