#!/usr/bin/env node
import 'source-map-support/register';
import {
  App, Environment, Fn
} from 'aws-cdk-lib';
import { ApiGatewayStack } from '../lib/api-gateway';
import { StepFunctionsStack } from '../lib/step-functions';

const app = new App();
const env: Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: process.env.CDK_DEFAULT_REGION!
}

const stepFunctionsStack = new StepFunctionsStack(app, 'StepFunctionsStack', {
  env,
  srcAddressSsmRef: '/ses/senderIdentity',
  definitionSrcPath: './assets/stepFunctions/sendMail.json'
});

const apiGatewayStack = new ApiGatewayStack(app, 'ApiGatewayStack', {
  env,
  stateMachineArn: Fn.importValue('stateMachineArn') //stepFunctionsStack.stateMachine.attrArn
});

apiGatewayStack.addDependency(stepFunctionsStack)
