
/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Melinda record harvester microservice
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

//import moment from 'moment';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import createStateInterface, {statuses} from '@natlibfi/melinda-record-harvest-commons';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import {MarcRecord, MarcRecordError} from '@natlibfi/marc-record';
import createOaiPmhClient, {OaiPmhError} from '@natlibfi/oai-pmh-client';

//export default async ({harvestPeriod, url, metadataPrefix, set, logLevel, stateInterfaceOptions}) => {
export default async ({url, metadataPrefix, set, logLevel, stateInterfaceOptions}) => {
  const oaiPmhClient = createOaiPmhClient({url, metadataPrefix, set, retrieveAll: false, filterDeleted: true});
  const logger = createLogger(logLevel);
  const {readState, writeState, handleQueues} = createStateInterface(stateInterfaceOptions);

  // Aleph generates subfields with empty values
  MarcRecord.setValidationOptions({subfieldValues: false});

  logger.log('info', `Starting melinda-record-harvest-harvester`);

  //  const {status, resumptionToken, timestamp} = await readState();
  const {status, error, resumptionToken} = await readState();

  if (status === statuses.harvestError) {
    logger.log('error', `Cannot proceed. Last run resulted in an error: ${error}`);
    return;
  }

  await handleQueues();

  if (status === statuses.harvestPending) {
    logger.log('info', resumptionToken ? `Resuming harvest. Cursor of last response: ${resumptionToken.cursor}` : 'Starting harvest');
    return harvest(resumptionToken);
  }

  if (status === statuses.harvestDone) {

    /*if (isHarvestDue()) {
      logger.log('info', 'Harvest is due');
      await writeState({status: statuses.pending});
      return harvest();
    }*/

    logger.info('Nothing to do. Exiting.');
    return;
  }

  logger.info('Nothing to do. Exiting.');

  /*function isHarvestDue() {
    const now = moment();
    const dumpAge = now.diff(timestamp);
    return dumpAge > harvestPeriod;
  }*/

  async function harvest(resumptionToken) {
    try {
      const {records, newToken} = await fetchRecords();

      if (newToken) {
        await writeState({
          status: statuses.harvestPending,
          resumptionToken: {token: newToken.token, cursor: newToken.cursor}
        }, records);
        logger.log('info', 'Harvesting more records');
        return harvest(newToken);
      }

      await writeState({status: statuses.harvestDone}, records);
    } catch (err) {
      if (err instanceof OaiPmhError) {
        const error = `OAI-PMH error: ${err.code}`;
        logger.log('error', `Cannot proceed because of an unexpected error: ${error}`);
        return writeState({status: statuses.harvestError, error});
      }

      throw err;
    }

    function fetchRecords() {
      return new Promise((resolve, reject) => {
        const promises = [];

        oaiPmhClient.listRecords({resumptionToken})
          .on('error', reject)
          .on('record', ({identifier, metadata}) => {
            promises.push(transform()); // eslint-disable-line functional/immutable-data

            function transform() {
              try {
                return MARCXML.from(metadata);
              } catch (err) {
                if (err instanceof MarcRecordError) {
                  logger.log('warn', `Skipping record ${identifier} because parsing failed: ${JSON.stringify(err.validationResults)}`);
                  return;
                }

                throw err;
              }
            }
          })
          .on('end', async newToken => {
            try {
              const values = await Promise.all(promises);
              // Remove undefined values caused by failing transformations
              const records = values.filter(v => v);
              resolve({records, newToken});
            } catch (err) {
              logger.error(`Unexpected error (${newToken ? `Token ${newToken}` : 'No token'})`);
              reject(err);
            }
          });
      });
    }
  }
};
