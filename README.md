# GraphQL API Server

[English](./README.md) | [繁體中文](./README.zh-HK.md)

A read-only GraphQL API built with Node.js and Apollo Server. It exposes the supplied JSON files through the required schema, resolves references between records, and protects every HTTP operation with a Bearer token.

## Requirements

- Node.js 24 or later
- npm 11 or later

## Quick start

Install the locked dependencies:

```bash
npm ci
```

Start the server with a demonstration token:

```bash
API_TOKEN=demo-token PORT=4000 npm start
```

The GraphQL endpoint is available at `http://localhost:4000/`.

`API_TOKEN` is required. `PORT` is optional and defaults to `4000`. The repository includes [.env.example](./.env.example), but the project intentionally has no `dotenv` dependency. To use a local `.env` file with Node.js 24:

```bash
cp .env.example .env
node --env-file=.env src/server.js
```

Never commit a real `.env` file or production token.

## Send a request

Every HTTP request must include `Authorization: Bearer <token>`. Missing, malformed, or incorrect credentials return HTTP `401` with GraphQL error code `UNAUTHENTICATED`.

### Apollo Sandbox

Apollo Sandbox loads the API schema through an introspection request, which also requires authentication in this project. Before using the Explorer:

1. Start the server with the demonstration token shown above and open `http://localhost:4000/`.
2. Select the settings icon beside the endpoint and add `Authorization: Bearer demo-token` as a shared connection header.
3. Reconnect to the endpoint or refresh the schema. The Schema panel should show `node(nodeId: ID): NodeObject` under `Query`.
4. If the operation does not inherit the shared header, add the same value in the operation's **Headers** tab.

If `ID` or `node` is marked as invalid while the Schema panel shows a different Query, Sandbox has not loaded the authenticated schema yet. Recheck the shared header and reconnect. When copying a fenced example, copy the query itself but not the Markdown language label `graphql`.

The following request fetches one Node and resolves its Trigger, Responses, Parents, and Actions:

```bash
curl --request POST \
  --url http://localhost:4000/ \
  --header 'Authorization: Bearer demo-token' \
  --header 'Content-Type: application/json' \
  --data '{"query":"query GetNode($nodeId: ID) { node(nodeId: $nodeId) { _id name trigger { _id name } responses { _id name } parents { _id name } actions { _id name } } }","variables":{"nodeId":"6297172e70a0c165b989cd10"}}'
```

Expected response shape:

```json
{
  "data": {
    "node": {
      "_id": "6297172e70a0c165b989cd10",
      "name": "User's Email",
      "trigger": {
        "_id": "6297176c10f525b8a81a9304",
        "name": "Email Trigger"
      },
      "responses": [
        {
          "_id": "6297189510f525833b1a9305",
          "name": "Get Email Response"
        }
      ],
      "parents": [
        {
          "_id": "6297164810f52524ba1a9300",
          "name": "Sign up Webinar"
        }
      ],
      "actions": [
        {
          "_id": "6530933e6a1690d2f0c78a92",
          "name": "Send Email Action"
        }
      ]
    }
  }
}
```

The same operation in readable GraphQL form is:

```graphql
query GetNode($nodeId: ID) {
  node(nodeId: $nodeId) {
    _id
    name
    trigger {
      _id
      name
    }
    responses {
      _id
      name
    }
    parents {
      _id
      name
    }
    actions {
      _id
      name
    }
  }
}
```

Variables:

```json
{
  "nodeId": "6297172e70a0c165b989cd10"
}
```

Omit `nodeId` to return the first root Node. An unknown ID returns `{"data":{"node":null}}` without a GraphQL error.

## Architecture

```text
HTTP POST /
  -> Apollo context and Bearer authentication
  -> Query and field resolvers
  -> read-only repository and in-memory Map indexes
  -> supplied JSON data files
```

- Apollo Context authenticates the request before any business resolver runs.
- `Query.node` selects a Node by `_id`, or selects the root Node when no ID is supplied.
- Field resolvers turn stored IDs into nested GraphQL objects.
- The repository loads the five JSON sources once and performs indexed, read-only lookups.
- `Long` and `JSON` are provided by `graphql-scalars`.

## Design decisions and data mappings

The source JSON stores relationships as references, while GraphQL exposes convenient nested objects:

1. `Node.trigger` stores a Trigger `_id` and resolves to one Trigger object.
2. `Node.responses` stores Response `_id` values and resolves to Response objects in the original order.
3. `Node.parents` stores Node `compositeId` values, so parents are looked up by `compositeId`, not `_id`.
4. The source has `preActions`, `actions`, and `postActions`, but the schema exposes one `actions` field. Their Action `_id` values are merged in that order, with nulls removed and duplicates keeping their first position.
5. `Trigger.resourceTemplateId` and `Action.resourceTemplateId` resolve ResourceTemplate objects by `_id`. If a supplied ResourceTemplate has no `createdAt`, its `updatedAt` is used because the required schema declares `createdAt` as non-null.

Authentication is enforced in Apollo Context before any query or field resolver runs. It uses the single shared `API_TOKEN` required by this code test; it is an API boundary, not a user, JWT, or role-based authorization system.

The supplied `functionString` values, ResourceTemplate schemas, and Response variation payloads are returned only as string or JSON data. The service never evaluates, imports, or otherwise executes data from the JSON files.

## Project structure

```text
.
├── .github
│   └── workflows
│       └── ci.yml
├── action.json
├── node.json
├── resourceTemplate.json
├── response.json
├── trigger.json
├── src
│   ├── auth.js
│   ├── config.js
│   ├── data
│   │   └── repository.js
│   ├── graphql
│   │   ├── resolvers.js
│   │   ├── scalars.js
│   │   └── typeDefs.js
│   └── server.js
└── test
    ├── data
    ├── graphql
    └── http
```

## Verification

Run the complete automated test suite:

```bash
npm test
```

Run static analysis:

```bash
npm run lint
```

The tests cover configuration, Bearer authentication, repository indexes, schema shape, resolvers, nested GraphQL operations, real HTTP behavior, and the rule that JSON `functionString` values remain inert data.

## Limitations and possible extensions

This code test intentionally implements only the required read-only `Query.node` API over local JSON data. Mutations, a database, user accounts, JWT/RBAC, subscriptions, pagination, filtering, external integrations, and execution of supplied `functionString` values are out of scope.

For a production service, likely next steps would include managed secret storage and token rotation, per-client authorization, request rate limits, structured operational logging, persistent storage, and pagination for larger datasets.
