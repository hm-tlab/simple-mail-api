import { Construct } from 'constructs';
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_apigateway as apigw,
  CfnOutput
} from 'aws-cdk-lib';

export interface ApiGatewayStackProps extends StackProps {
  readonly stateMachineArn: string;
}

export class ApiGatewayStack extends Stack {
  api: apigw.RestApi;
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    const apigatewayRole = new iam.Role(this, 'apiGatewayRole', {
      roleName: 'apiGatewayRole',
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      inlinePolicies: {
        'startExecution': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'states:StartExecution'
              ],
              resources: [props.stateMachineArn]
            })
          ]
        })
      }
    });

    this.api = new apigw.RestApi(this, 'api', { restApiName: 'mailBackend' });
    const mailRequestModel = new apigw.Model(this, "mailRequestModel", {
      restApi: this.api,
      contentType: 'application/json',
      modelName: "MailRequest",
      schema: {
        properties: {
          inquirerAddress: {
            type: apigw.JsonSchemaType.STRING,
            pattern: '^\\S+@\\S+\\.\\S+$',
            format: 'email'
          },
          inquirerName: {
            type: apigw.JsonSchemaType.STRING
          },
          inquirySubject: {
            type: apigw.JsonSchemaType.STRING
          },
          inquiryMessage: {
            type: apigw.JsonSchemaType.STRING,
            minLength: 8,
            maxLength: 4096
          }
        },
        required: ["inquirerAddress", "inquirerName", "inquiryMessage"]
      }
    });
    const mailResponseModel = new apigw.Model(this, "mailResponseModel", {
      restApi: this.api,
      contentType: 'application/json',
      modelName: "MailResponse",
      schema: {
        properties: {
          inquiryMessage: {
            type: apigw.JsonSchemaType.STRING,
          }
        },
        required: ["result"]
      }
    });
    const mailRequestValidater = new apigw.RequestValidator(this, "mailRequestValidater", {
      requestValidatorName: "mailRequestValidater",
      restApi: this.api,
      validateRequestBody: true
    })

    const defaultIntegration = new apigw.AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      proxy: false,
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: apigatewayRole,
        passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES,
        // requestParameters: {
        //   'integration.request.body.inquirerAddress': 'method.request.body.inquirerAddress',
        //   'integration.request.body.inquirerName': 'method.request.body.inquirerName',
        //   'integration.request.body.inquirerMessage': 'method.request.body.inquiryMessage'
        // },
        requestTemplates: {
          "application/json": JSON.stringify(
            {
              "input": "$util.escapeJavaScript($input.json('$'))",
              "stateMachineArn": props.stateMachineArn
            }
          )
        },
        integrationResponses: [{
          statusCode: "200",
          responseTemplates: {
            'application/json': JSON.stringify(
              {
                "result": "OK"
              }
            )
          }
        }]
      }
    });

    const publicResource = this.api.root.addResource('public');
    const mailResource = publicResource.addResource('mail');
    mailResource.addMethod('POST', defaultIntegration, {
      requestValidator: mailRequestValidater,
      requestModels: {
        'application/json': mailRequestModel
      },
      methodResponses: [{
        statusCode: "200",
        responseModels: { 'application/json': mailResponseModel }
      }]

      // requestParameters: {
      //   'method.request.body.inquirerAddress': true,
      //   'method.request.body.inquirerName': true,
      //   'method.request.body.inquiryMessage': true
      // }
    });
  }
}
