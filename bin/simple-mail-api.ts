#!/usr/bin/env node
import 'source-map-support/register';
import {
  App, Environment
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

new ApiGatewayStack(app, 'ApiGatewayStack', {
  env,
  stateMachineArn: stepFunctionsStack.stateMachine.attrArn
});
