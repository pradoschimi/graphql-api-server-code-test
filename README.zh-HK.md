# GraphQL API Server

[English](./README.md) | [繁體中文](./README.zh-HK.md)

這是一個使用 Node.js 和 Apollo Server 構建的唯讀 GraphQL API。它透過題目指定的 Schema 提供所附的 JSON 數據、解析記錄之間的引用關係，並使用 Bearer Token 保護每一個 HTTP 操作。

## 環境要求

- Node.js 24 或以上版本
- npm 11 或以上版本

## 快速開始

依照鎖定版本安裝依賴套件：

```bash
npm ci
```

使用示範 Token 啟動伺服器：

```bash
API_TOKEN=demo-token PORT=4000 npm start
```

GraphQL 端點位於 `http://localhost:4000/`。

`API_TOKEN` 為必填配置；`PORT` 為選填配置，預設值為 `4000`。項目包含 [.env.example](./.env.example)，但刻意不引入 `dotenv` 依賴套件。如要在 Node.js 24 使用本機 `.env` 文件：

```bash
cp .env.example .env
node --env-file=.env src/server.js
```

請勿提交真實的 `.env` 文件或正式環境 Token。

## 發送請求

每個 HTTP 請求都必須包含 `Authorization: Bearer <token>`。缺少憑證、格式錯誤或 Token 不正確時，伺服器會返回 HTTP `401`，GraphQL 錯誤代碼為 `UNAUTHENTICATED`。

以下請求會獲取一個 Node，並解析其 Trigger、Responses、Parents 和 Actions：

```bash
curl --request POST \
  --url http://localhost:4000/ \
  --header 'Authorization: Bearer demo-token' \
  --header 'Content-Type: application/json' \
  --data '{"query":"query GetNode($nodeId: ID) { node(nodeId: $nodeId) { _id name trigger { _id name } responses { _id name } parents { _id name } actions { _id name } } }","variables":{"nodeId":"6297172e70a0c165b989cd10"}}'
```

預期回應格式：

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

相同操作的易讀 GraphQL 格式如下：

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

變數：

```json
{
  "nodeId": "6297172e70a0c165b989cd10"
}
```

省略 `nodeId` 時會返回第一個根 Node。使用不存在的 ID 時，伺服器會返回 `{"data":{"node":null}}`，而不會產生 GraphQL 錯誤。

## 架構

```text
HTTP POST /
  -> Apollo Context 和 Bearer 身份驗證
  -> Query 和字段 Resolver
  -> 唯讀 Repository 和記憶體內的 Map 索引
  -> 題目提供的 JSON 數據文件
```

- Apollo Context 會在任何業務 Resolver 執行前驗證請求。
- `Query.node` 會按 `_id` 選取 Node；未提供 ID 時則選取根 Node。
- 字段 Resolver 會將已儲存的 ID 轉換為嵌套 GraphQL 物件。
- Repository 只會載入五份 JSON 數據一次，並通過索引進行唯讀查詢。
- `Long` 和 `JSON` 由 `graphql-scalars` 提供。

## 項目結構

```text
.
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

## 驗證

執行完整的自動化測試：

```bash
npm test
```

執行靜態分析：

```bash
npm run lint
```

測試範圍包括配置、Bearer 身份驗證、Repository 索引、Schema 結構、Resolver、嵌套 GraphQL 操作、真實 HTTP 行為，以及確保 JSON 中的 `functionString` 始終只是不可執行數據的安全規則。

## 目前範圍

此編程測試只實現一個以本機 JSON 為數據來源的唯讀 `Query.node` API。不包括 Mutation、數據庫、用戶帳戶、JWT/RBAC、Subscription，也不會執行題目數據中的 `functionString`。
