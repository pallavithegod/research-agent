@description('Azure region for the complete application stack.')
param location string = resourceGroup().location

@description('Short environment name, for example prod or staging.')
param environmentName string = 'prod'

@description('Name of an existing Azure Container Registry in this resource group.')
param registryName string

@description('Full ACR image reference for the FastAPI API.')
param apiImage string

@description('Full ACR image reference for the research worker. Usually the same image as apiImage.')
param workerImage string

@description('Full ACR image reference for the Next.js web application.')
param webImage string

@secure()
@description('MongoDB Atlas connection URI.')
param mongodbUri string

@description('MongoDB database name.')
param mongodbDatabase string = 'research_agent'

@secure()
@description('Strong API HMAC secret, at least 32 characters.')
param hmacSecret string

@secure()
@description('Upstash Redis REST URL.')
param upstashRedisRestUrl string

@secure()
@description('Upstash Redis REST token.')
param upstashRedisRestToken string

@secure()
@description('DeepSeek API key.')
param deepseekApiKey string

@secure()
@description('Tavily API key.')
param tavilyApiKey string

@description('Require Clerk authentication. False creates an explicit anonymous prototype deployment.')
param authEnabled bool = false

@description('Clerk issuer. Required when authEnabled is true.')
param clerkIssuer string = ''

@description('Clerk JWKS URL. Required when authEnabled is true.')
param clerkJwksUrl string = ''

@description('Optional Clerk JWT audience.')
param clerkAudience string = ''

@description('Clerk publishable key compiled into and supplied to the web app when auth is enabled.')
param clerkPublishableKey string = ''

@secure()
@description('Clerk server secret key when auth is enabled.')
param clerkSecretKey string = ''

@secure()
@description('Optional Azure Blob Storage connection string for browser artifacts.')
param azureBlobConnectionString string = ''

@description('Azure Blob container for browser artifacts.')
param azureBlobContainer string = 'research-agent-artifacts'

@description('Enable x402 commerce requests.')
param x402Enabled bool = false

@description('HTTPS x402 commerce endpoint. Required when x402Enabled is true.')
param x402CommerceEndpoint string = ''

@description('Comma-separated x402 provider host allowlist.')
param x402ProviderAllowlist string = ''

var namePrefix = 'research-agent-${environmentName}'
var apiName = '${namePrefix}-api'
var webName = '${namePrefix}-web'
var workerName = '${namePrefix}-worker'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-pull'
  location: location
}

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, pullIdentity.id, acrPullRoleDefinitionId)
  scope: registry
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleDefinitionId
  }
}

resource outboundIp 'Microsoft.Network/publicIPAddresses@2023-11-01' = {
  name: '${namePrefix}-egress-ip'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
  }
}

resource natGateway 'Microsoft.Network/natGateways@2023-11-01' = {
  name: '${namePrefix}-nat'
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    idleTimeoutInMinutes: 10
    publicIpAddresses: [
      {
        id: outboundIp.id
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: '${namePrefix}-vnet'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.20.0.0/16'
      ]
    }
  }
}

resource infrastructureSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' = {
  parent: vnet
  name: 'container-apps-infrastructure'
  properties: {
    addressPrefix: '10.20.0.0/23'
    natGateway: {
      id: natGateway.id
    }
    delegations: [
      {
        name: 'container-apps-delegation'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
  }
}

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env'
  location: location
  properties: {
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnet.id
      internal: false
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

var requiredSecrets = [
  {
    name: 'mongodb-uri'
    value: mongodbUri
  }
  {
    name: 'hmac-secret'
    value: hmacSecret
  }
  {
    name: 'upstash-url'
    value: upstashRedisRestUrl
  }
  {
    name: 'upstash-token'
    value: upstashRedisRestToken
  }
  {
    name: 'deepseek-key'
    value: deepseekApiKey
  }
  {
    name: 'tavily-key'
    value: tavilyApiKey
  }
]

var blobSecrets = empty(azureBlobConnectionString) ? [] : [
  {
    name: 'blob-connection'
    value: azureBlobConnectionString
  }
]

var clerkSecrets = authEnabled ? [
  {
    name: 'clerk-secret-key'
    value: clerkSecretKey
  }
] : []

var allSecrets = concat(requiredSecrets, blobSecrets, clerkSecrets)

var commonApiEnv = [
  {
    name: 'APP_NAME'
    value: 'Research Agent Backend'
  }
  {
    name: 'ENVIRONMENT'
    value: 'production'
  }
  {
    name: 'API_PREFIX'
    value: '/v1'
  }
  {
    name: 'FRONTEND_ORIGIN'
    value: ''
  }
  {
    name: 'AUTH_REQUIRED'
    value: string(authEnabled)
  }
  {
    name: 'ALLOW_ANONYMOUS_PRODUCTION'
    value: string(!authEnabled)
  }
  {
    name: 'CLERK_ISSUER'
    value: clerkIssuer
  }
  {
    name: 'CLERK_JWKS_URL'
    value: clerkJwksUrl
  }
  {
    name: 'CLERK_AUDIENCE'
    value: clerkAudience
  }
  {
    name: 'STORAGE_BACKEND'
    value: 'mongodb'
  }
  {
    name: 'AUTO_CREATE_DATABASE_SCHEMA'
    value: 'false'
  }
  {
    name: 'MONGODB_URI'
    secretRef: 'mongodb-uri'
  }
  {
    name: 'MONGODB_DATABASE'
    value: mongodbDatabase
  }
  {
    name: 'MONGODB_APP_NAME'
    value: 'ResearchAgentAzure'
  }
  {
    name: 'MONGODB_SERVER_SELECTION_TIMEOUT_MS'
    value: '10000'
  }
  {
    name: 'HMAC_SECRET'
    secretRef: 'hmac-secret'
  }
  {
    name: 'JOB_QUEUE_BACKEND'
    value: 'upstash'
  }
  {
    name: 'RESEARCH_JOB_QUEUE_NAME'
    value: 'research:jobs'
  }
  {
    name: 'WORKER_POLL_SECONDS'
    value: '2'
  }
  {
    name: 'UPSTASH_REDIS_REST_URL'
    secretRef: 'upstash-url'
  }
  {
    name: 'UPSTASH_REDIS_REST_TOKEN'
    secretRef: 'upstash-token'
  }
  {
    name: 'DEEPSEEK_API_KEY'
    secretRef: 'deepseek-key'
  }
  {
    name: 'DEEPSEEK_BASE_URL'
    value: 'https://api.deepseek.com'
  }
  {
    name: 'DEEPSEEK_MODEL'
    value: 'deepseek-chat'
  }
  {
    name: 'TAVILY_API_KEY'
    secretRef: 'tavily-key'
  }
  {
    name: 'BROWSER_HEADLESS'
    value: 'true'
  }
  {
    name: 'BROWSER_ARTIFACT_DIR'
    value: '/tmp/research-browser'
  }
  {
    name: 'ARTIFACT_STORAGE_BACKEND'
    value: empty(azureBlobConnectionString) ? 'none' : 'azure_blob'
  }
  {
    name: 'AZURE_BLOB_CONTAINER'
    value: azureBlobContainer
  }
  {
    name: 'SUPPORTED_PAYMENT_ASSETS'
    value: 'USDC'
  }
  {
    name: 'SUPPORTED_PAYMENT_NETWORKS'
    value: 'base-sepolia,base'
  }
  {
    name: 'X402_ENABLED'
    value: string(x402Enabled)
  }
  {
    name: 'X402_COMMERCE_ENDPOINT'
    value: x402CommerceEndpoint
  }
  {
    name: 'X402_PROVIDER_ALLOWLIST'
    value: x402ProviderAllowlist
  }
  {
    name: 'LOG_LEVEL'
    value: 'INFO'
  }
]

var blobEnv = empty(azureBlobConnectionString) ? [] : [
  {
    name: 'AZURE_BLOB_CONNECTION_STRING'
    secretRef: 'blob-connection'
  }
]

var apiEnv = concat(commonApiEnv, blobEnv)

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: allSecrets
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: apiEnv
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/v1/health/live'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/v1/health/ready'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 20
              periodSeconds: 15
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '40'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPull
  ]
}

resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: workerName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: allSecrets
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          command: [
            'python'
            '-m'
            'app.workers.research_worker'
          ]
          env: apiEnv
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
  dependsOn: [
    acrPull
  ]
}

var webSecrets = authEnabled ? [
  {
    name: 'clerk-secret-key'
    value: clerkSecretKey
  }
] : []

var webEnv = concat([
  {
    name: 'NODE_ENV'
    value: 'production'
  }
  {
    name: 'PORT'
    value: '3000'
  }
  {
    name: 'HOSTNAME'
    value: '0.0.0.0'
  }
  {
    name: 'BACKEND_API_URL'
    value: 'http://${apiName}'
  }
  {
    name: 'NEXT_PUBLIC_API_URL'
    value: '/api/backend'
  }
  {
    name: 'NEXT_PUBLIC_AUTH_ENABLED'
    value: string(authEnabled)
  }
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
    value: clerkPublishableKey
  }
], authEnabled ? [
  {
    name: 'CLERK_SECRET_KEY'
    secretRef: 'clerk-secret-key'
  }
] : [])

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: webName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: webSecrets
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          env: webEnv
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 15
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 4
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '60'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPull
    api
  ]
}

output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
output apiInternalName string = api.name
output atlasAllowlistIp string = outboundIp.properties.ipAddress
output containerRegistry string = registry.properties.loginServer
output containerAppsEnvironmentName string = appEnv.name
