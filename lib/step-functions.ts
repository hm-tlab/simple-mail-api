import { Construct } from 'constructs';
import { CfnStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import {
  Stack,
  StackProps,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';


export interface StapFunctionsStackProps extends StackProps {
  srcAddressSsmRef: string;
  definitionSrcPath: string;
}

export class StepFunctionsStack extends Stack {
  stateMachine: CfnStateMachine;
  constructor(scope: Construct, id: string, props: StapFunctionsStackProps) {
    super(scope, id, props);
    var definition = require(props.definitionSrcPath);
    const srcAddress = StringParameter.valueForStringParameter(this, props.srcAddressSsmRef)
    const env = props.env!
    const executionRole = new iam.Role(this, 'executionRole', {
      roleName: 'StepFunctionsRole',
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        'SendMail': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ses:SendEmail'
              ],
              resources: [`arn:aws:ses:${env.region}:${env.account}:identity/${srcAddress}`]
            })
          ]
        })
      }
    });

    definition["States"]["SendInquiry"]["Parameters"]["Source"] = srcAddress;
    definition["States"]["SendInquiry"]["Parameters"]["Destination"]["ToAddresses"] = [srcAddress];
    definition["States"]["SendCopy"]["Parameters"]["Source"] = srcAddress;

    this.stateMachine = new CfnStateMachine(this, 'sendMail', {
      stateMachineName: 'sendMail',
      roleArn: executionRole.roleArn,
      definition
    });
  }
}
