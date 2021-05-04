import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";
import * as faker from 'faker';

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function putRecords() {
    const streamName = process.env.STREAM_NAME;
    const funcId = process.env.FUNCTION_INDEX;
    const client = new KinesisClient({ region: process.env.AWS_REGION });
    
    const data = {
        unitname: funcId,
        serialnumber: faker.datatype.uuid(),
        name: faker.name.findName(),
        origin: faker.address.state(),
        time: new Date().valueOf(),
        temperature: faker.datatype.number({min: 3500, max: 4000}) / 100,
    };
    
    const command = new PutRecordCommand({
        Data: new TextEncoder().encode(JSON.stringify(data)),
        StreamName: streamName,
        PartitionKey: 'partition_key',
    });
    
    const status = { data, success: true, message: '' };
    try {
        const retval = await client.send(command);
        status.message = "Shard ID: " + retval.ShardId;
    } catch (error) {
        status.success = false;
        status.message = "Error: " + error.message
    } finally {
        console.log(JSON.stringify(status));
    }
}

export const handler = async (event: any = {}): Promise<any> => {
    const funcId = process.env.FUNCTION_INDEX;
    for (let i = 0; i < 60; i++) {
        await putRecords();
        const delayTime = faker.datatype.number({min: 1, max: 20}) * 100;
        await delay(delayTime);
    }
    return {
        funcId
    };
};

