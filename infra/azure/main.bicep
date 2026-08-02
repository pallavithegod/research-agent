@description('Azure region for the Container Apps environment.')
param location string = resourceGroup().location

@description('Short environment name, for example prod or staging.')
param environmentName string = 'prod'

@description('Container image for the FastAPI API.')
param apiImage string

@description('Container image for the research worker.')
param workerImage string

@description('Public Vercel frontend origin, for example https://example.vercel.app.')
param frontendOrigin string

@secure()
@description('Supabase runtime DATABASE_URL.')
param databaseUrl string

@secure()
@description('Supabase migration connection URL. Stored for operational use; migrations are run manually.')
param migrationsDatabaseUrl string

@secure()
@description('Strong API HMAC secret.')
param hmacSecret string

@secure()
@description('Upstash Redis REST URL.')
param upstashRedisRestUrl string

@secure()
@description('Upstash Redis REST token.')
param upstashRedisRestToken string

@description('Clerk production issuer/domain.')
param clerkIssuer string

@description('Clerk production JWKS URL.')
param clerkJwksUrl string

@description('Optional Clerk JWT audience.')
param clerkAudience string = ''

@description('Optional container registry server, for example myregistry.azurecr.io. Leave empty for public images.')
param registryServer string = ''

@description('Optional container registry username.')
param registryUsername string = ''

@secure()
@description('Optional container registry password.')
param registryPassword string = ''

var namePrefix = 'research-agent-${environmentName}'
var hasRegistry = !empty(registryServer)

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
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

var commonSecrets = [
  {
    name: 'database-url'
    value: databaseUrl
  }
  {
    name: 'migrations-database-url'
    value: migrationsDatabaseUrl
  }
  {
    name: 'hmac-secret'
    value: hmacSecret
  }
  {
    name: 'upstash-redis-rest-url'
    value: upstashRedisRestUrl
  }
  {
    name: 'upstash-redis-rest-token'
    value: upstashRedisRestToken
  }
]

var registrySecrets = hasRegistry ? [
  {
    name: 'registry-password'
    value: registryPassword
  }
] : []

var secretRefs = concat(commonSecrets, registrySecrets)

var commonEnv = [
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
    value: frontendOrigin
  }
  {
    name: 'AUTH_REQUIRED'
    value: 'true'
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
    value: 'postgres'
  }
  {
    name: 'AUTO_CREATE_DATABASE_SCHEMA'
    value: 'false'
  }
  {
    name: 'DATABASE_URL'
    secretRef: 'database-url'
  }
  {
    name: 'MIGRATIONS_DATABASE_URL'
    secretRef: 'migrations-database-url'
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
    secretRef: 'upstash-redis-rest-url'
  }
  {
    name: 'UPSTASH_REDIS_REST_TOKEN'
    secretRef: 'upstash-redis-rest-token'
  }
  {
    name: 'OBJECT_STORAGE_BUCKET'
    value: ''
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
    name: 'MAX_PAYMENT_PIN_ATTEMPTS'
    value: '5'
  }
  {
    name: 'PAYMENT_PIN_LOCK_SECONDS'
    value: '900'
  }
  {
    name: 'LOG_LEVEL'
    value: 'INFO'
  }
]

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-api'
  location: location
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: secretRefs
      registries: hasRegistry ? [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: commonEnv
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
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
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${namePrefix}-worker'
  location: location
  properties: {
    managedEnvironmentId: appEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secretRefs
      registries: hasRegistry ? [
        {
          server: registryServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          env: commonEnv
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output apiFqdn string = api.properties.configuration.ingress.fqdn
output apiUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
output containerAppsEnvironmentName string = appEnv.name
