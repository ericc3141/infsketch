/* Simple "allocator" that works off an array/buffer
 */
"use strict";

/* arr- array to allocate from
 * splitThresh- size threshold at which to bother splitting a free block
 */
export const createAlloc = ({arr, splitThresh = 32} = {}) => {
    // Sorted list of used and free blocks in format
    // [ptr, size]
    // ptr- index in memory where block starts
    // size- number of elements in block
    let useList = [];
    let freeList = [[0, arr.length]];
    let stats = {
        size: arr.length,
        free: arr.length,
        blocks: 0,
    }

    /* Determine if there is a block starting at ptr in list
     * return- index in list if found, else -1
     */
    function findBlock(ptr, list) {
        for (let i = 0; i < list.length; i ++) {
            if (list[i][0] === ptr) {
                return i;
            }
        }
        return -1;
    }

    /* Insert new block into specified list
     * return- index at which block was inserted.
     * note- copies block before inserting.
     */
    function insertBlock(block, list) {
        let i = 0;
        while (i < list.length && list[i][0] < block[0]) {
            i ++;
        }
        list.splice(i, 0, block.slice());
        return i;
    }

    /* Sweeps freeList and combines adjacent blocks into one
    */
    function mergeFree() {
        for (let i = 1; i < freeList.length; i ++) {
            // If previous block does not reach start of current,
            if (freeList[i-1][0] + freeList[i-1][1] < freeList[i][0]) {
                continue;
            }
            freeList[i-1][1] += freeList[i][1];
            freeList.splice(i, 1);
            i --;
        }
    }

    function resize(newsize) {
        // Make sure we don't cut any blocks off
        let lastused = useList[useList.length - 1];
        if (newsize < lastused[0] + lastused[1]) {
            return -1;
        }
        // Waiting for https://github.com/domenic/proposal-arraybuffer-transfer?
        if (newsize < stats.size) {
            arr = arr.slice(0, newsize);
        } else if (newsize > stats.size) {
            let newarr = new arr.constructor(newsize);
            newarr.set(arr);
            arr = newarr;
        }
        let diff = newsize - stats.size;
        freeList.push([stats.size, diff]);
        mergeFree();
        stats.free += diff;
        stats.size = arr.length;
        return arr;
    }

    /* Allocates new block from array.
     * return- ptr to new block if success, else -1
     * note- simple first-fit alloc.
     */
    function alloc(size) {
        // Find suitable free block
        if (freeList.length === 0) {
            return -1;
        }
        let i;
        for (i = 0; i < freeList.length; i ++) {
            if (freeList[i][1] >= size) {
                break;
            }
        }
        if (freeList[i][1] < size) {
            return -1;
        }
        let block = freeList.splice(i, 1)[0];
        // See if can split
        let excess = block[1] - size;
        if (excess > splitThresh) {
            block[1] = size;
            insertBlock([block[0] + size, excess], freeList);
        }
        insertBlock(block, useList);
        stats.free -= block[1];
        return block[0];
    }

    /* Returns block to array
     * return- 0 if success, -1 if block not found
     * note- zeroes out freed block
     */
    function free(ptr) {
        let blockid = findBlock(ptr, useList);
        if (blockid < 0) {
            return -1;
        }
        let block = useList.splice(blockid, 1)[0];
        memset(block[0], 0, block[1]);
        insertBlock(block, freeList);
        stats.free += block[1];
        mergeFree();
        return 0;
    }

    /* Ensure block starting at ptr is at least size
     * return- ptr to block if success, else -1.
     */
    function realloc(ptr, size) {
        let currId = findBlock(ptr, useList);
        if (currId < 0) {
            return -1;
        }
        let curr = useList[currId];
        let needed = size - curr[1];
        // Same or smaller size. Reuse block.
        if (needed <= 0) {
            // See if can shrink block
            if (needed <= -splitThresh) {
                curr[1] = size;
                insertBlock([curr[0]+curr[1], -needed], freeList);
                stats.free -= needed;
                mergeFree();
            }
            return ptr;
        }

        // See if we can just expand the block
        let nextId = findBlock(curr[0] + curr[1], freeList);
        if (nextId >= 0 && freeList[nextId][1] >= needed) {
            // Next bock is indeed free, and 
            // Large enough to do merge
            let next = freeList[nextId];
            if (next[1] - needed >= splitThresh) {
                next[0] += needed;
                next[1] -= needed;
            } else {
                freeList.splice(nextId, 1);
            }
            stats.free -= needed;
            curr[1] = size;
            return ptr;
        }

        // Failing that, alloc again, copy, and free old
        let newalloc = alloc(size);
        if (newalloc < 0) {
            return -1;
        }
        memcpy(ptr, newalloc, curr[1]);
        free(ptr);
        return newalloc;
    }

    /* Set range starting at idx, of length size, to val
     */
    function memset(ptr, val, size) {
        for (let i = 0; i < size; i ++) {
            arr[ptr + i] = val;
        }
    }

    /* Copy range starting at src to range starting at dest,
     * of length size
     */
    function memcpy(src, dest, size) {
        // Use typedarray methods if possible
        if (arr.buffer) {
            let elemsize = arr.byteLength / arr.length;
            let srcview = new arr.constructor(arr.buffer, elemsize * src, size);
            arr.set(srcview, dest);
            return;
        }
        // If copying to higher ptr,
        // start copying from end of range
        if (src < dest) {
            for (let i = size - 1; i >= 0; i --) {
                arr[dest + i] = arr[src + i];
            }
        // Otherwise, start from beginning of range.
        } else if (src > dest) {
            for (let i = 0; i < size; i ++) {
                arr[dest + i] = arr[src + i];
            }
        }
    }

    return {
        resize,
        alloc,
        free,
        realloc,
        memset,
        stats,
    }
}
