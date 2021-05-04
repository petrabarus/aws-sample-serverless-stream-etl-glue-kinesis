import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as iam from '@aws-cdk/aws-iam';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as path from 'path';

export class CdkStack extends cdk.Stack {
  private bucket: s3.Bucket;
  private stream: kinesis.Stream;
  
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.createBucket();
    this.createStream();
    this.createProducers();
  }
  
  createBucket() {
    this.bucket = new s3.Bucket(this, 'Bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
  
  createStream() {
    this.stream = new kinesis.Stream(this, 'Stream', {});
  }
  
  createProducers() {
    const role = this.createFunctionRole();
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(1 minute)')
    });
    
    Array(5).fill(0).map((_, i) => {
      const lambdaFunc = this.createProducerFunction(i, role);
      rule.addTarget(new targets.LambdaFunction(lambdaFunc));
    });
    
    this.stream.grantWrite(role);
  }
  
  createFunctionRole(): iam.Role {
    const managedPolicies = new Array<iam.IManagedPolicy>();
    managedPolicies.push(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
    
    return new iam.Role(this, 'ServiceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies,
    });
  }
  
  createProducerFunction(i: number, role: iam.Role): lambda.Function {
    const assetPath = path.join(__dirname, '../../lambda');
    const asset = lambda.Code.fromAsset(assetPath);
    
    return new lambda.Function(this, 'ProducerFunction' + i, {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      role,
      code: asset,
      timeout: cdk.Duration.minutes(3),
      environment: {
        FUNCTION_INDEX: 'func-' + i,
        STREAM_NAME: this.stream.streamName,
      }
    });
  }
}
