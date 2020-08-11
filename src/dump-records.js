
/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Record harvester microservice for Melinda
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-harvest-harvester
*
* melinda-record-harvest-harvester program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-harvest-harvester is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import {promises as fsPromises} from 'fs';
import {join as joinPath} from 'path';
import moment from 'moment';
import {Utils} from '@natlibfi/melinda-commons';
import {ISO2709} from '@natlibfi/marc-record-serializers';

export default ({dumpDirectory, maxFileSize, logLevel}) => async ({records, isDone, stateTimestamp, fileNamePrefix}) => {
  const {createLogger} = Utils;
  const logger = createLogger(logLevel);
  const {open, rename, unlink, readdir, mkdir} = fsPromises;

  await initDumpDirectory();
  await clearIncomplete();

  const tempPath = joinPath(dumpDirectory, 'tmp.marc');
  const tempFileHandle = await open(tempPath, 'a+');
  const {size: tempFileSize} = tempFileHandle.stat();

  return iterate({records});

  async function initDumpDirectory() {
    try {
      await mkdir(dumpDirectory);
    } catch (err) {
      if (err.code === 'EEXIST') {
        return;
      }

      throw err;
    }
  }

  // Remove files that were written but the state was not updated
  async function clearIncomplete() {
    const needsRemoving = await getNeedsRemoving();
    await Promise.all(needsRemoving.map(unlink));

    if (needsRemoving.length === 0) {
      return;
    }

    logger.debug(`Cleared ${needsRemoving.length} files from the incomplete last run`);

    async function getNeedsRemoving() {
      const fileNames = await readdir(dumpDirectory);
      const filesMetadata = await Promise.all(fileNames.map(getMetadata));
      return filesMetadata.filter(filterIncomplete).map(({path}) => path);

      async function getMetadata(fileName) {
        const path = joinPath(dumpDirectory, fileName);
        const fileHandle = await open(path);
        const {mtime} = await fileHandle.stat();
        return {path, timestamp: moment(mtime)};
      }

      // Filter out files that have been updated before the state and are therefore legit
      function filterIncomplete({timestamp}) {
        return timestamp.isAfter(stateTimestamp);
      }
    }
  }

  async function iterate({records, tempBuffer, chunks = []}) {
    const [record] = records;

    if (record) {
      const recordBuffer = Buffer.from(ISO2709.to(record));

      // TempBuffer is already at max
      if (chunks.length > 0) {
        const [lastChunk] = chunks.slice(-1);
        const newChunkSize = lastChunk.length + recordBuffer.length + 1;

        if (newChunkSize > maxFileSize) {
          return iterate({
            tempBuffer,
            records: records.slice(1),
            chunks: chunks.concat(recordBuffer)
          });
        }

        return iterate({
          tempBuffer,
          records: records.slice(1),
          chunks: chunks.slice(-1).concat(Buffer.concat([lastChunk, Buffer.from('\x03'), recordBuffer]))
        });
      }

      const newTempSize = tempFileSize + (tempBuffer?.length || 0) + recordBuffer.length + 1;

      if (newTempSize > maxFileSize) {
        return iterate({
          tempBuffer,
          records: records.slice(1),
          chunks: [recordBuffer]
        });
      }

      return iterate({
        tempBuffer: tempBuffer ? Buffer.concat([tempBuffer, Buffer.from('\x03'), recordBuffer]) : recordBuffer,
        records: records.slice(1)
      });
    }

    logger.log('debug', 'Writing files');
    await tempFileHandle.write(tempBuffer);

    const lastIndex = await getLastIndex();
    const newIndex = lastIndex ? lastIndex + 1 : 0;
    const newPath = joinPath(dumpDirectory, generateFileName(newIndex));

    await rename(tempPath, newPath);
    await writeChunks(chunks, newIndex);

    function generateFileName(index) {
      const indexSuffix = index.toString().padEnd(6, '0');
      return `${fileNamePrefix}-${indexSuffix}.marc`;
    }

    async function writeChunks(chunks, lastIndex) {
      const [chunk] = chunks;

      if (chunk) {
        // The last chunk is not at max and there's more records to be retrieved
        if (chunks.length === 1 && chunk.length < maxFileSize && isDone === false) {
          await tempFileHandle.truncate(0);
          await tempFileHandle.write(chunk);
          await tempFileHandle.close();
          return;
        }

        const fileHandle = await open(joinPath(dumpDirectory, generateFileName(lastIndex + 1)));
        await fileHandle.write(chunk);
        await fileHandle.close();

        return writeChunks(chunks.slice(1), lastIndex + 1);
      }
    }

    async function getLastIndex() {
      const fileNames = await readdir(dumpDirectory);
      const [, lastIndex] = fileNames
        .filter(v => v.startsWith(fileNamePrefix))
        .map(v => v.split('-')[1])
        .sort()
        .slice(-1);

      return lastIndex;
    }
  }
};
