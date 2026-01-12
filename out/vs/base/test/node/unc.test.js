/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { getUNCHost } from '../../node/unc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('UNC', () => {
    test('getUNCHost', () => {
        strictEqual(getUNCHost(undefined), undefined);
        strictEqual(getUNCHost(null), undefined);
        strictEqual(getUNCHost('/'), undefined);
        strictEqual(getUNCHost('/foo'), undefined);
        strictEqual(getUNCHost('c:'), undefined);
        strictEqual(getUNCHost('c:\\'), undefined);
        strictEqual(getUNCHost('c:\\foo'), undefined);
        strictEqual(getUNCHost('c:\\foo\\\\server\\path'), undefined);
        strictEqual(getUNCHost('\\'), undefined);
        strictEqual(getUNCHost('\\\\'), undefined);
        strictEqual(getUNCHost('\\\\localhost'), undefined);
        strictEqual(getUNCHost('\\\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\.'), undefined);
        strictEqual(getUNCHost('\\\\?'), undefined);
        strictEqual(getUNCHost('\\\\.\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost'), '.');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost'), '?');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\'), 'localhost');
        strictEqual(getUNCHost('\\\\.\\UNC\\localhost\\a'), 'localhost');
        strictEqual(getUNCHost('\\\\?\\UNC\\localhost\\a'), 'localhost');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3VuYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzlDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTVFLEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO0lBQ2pCLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDN0MsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV4QyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFMUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN4QyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDN0MsV0FBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTdELFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDeEMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRW5ELFdBQVcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN2RCxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFeEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMzQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTNDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFaEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELFdBQVcsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUVyRCxXQUFXLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDL0QsV0FBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRS9ELFdBQVcsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNoRSxXQUFXLENBQUMsVUFBVSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDakUsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=