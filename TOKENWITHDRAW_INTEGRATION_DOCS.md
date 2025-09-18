# TokenWithdrawToFiat Integration Documentation

## Overview

Implementasi ini mengintegrasikan query Goldsky `tokenWithdrawnToFiat` untuk menyimpan data withdrawal ke database dan menampilkannya di receiver history page.

## 🏗️ Architecture

### Backend Components

#### 1. Model Database (`/models/tokenWithdrawToFiatModel.ts`)

```typescript
interface ITokenWithdrawToFiat {
  blockNumber: string;
  amount: string;
  contractId: string;
  depositWallet: string;
  escrowId: string;
  chainId: string; // Goldsky ID untuk unique constraint
  receiver: string;
  timestamp: string;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Features:**

- Indexes untuk performance query berdasarkan receiver, escrowId, dan transactionHash
- Unique constraint pada chainId untuk menghindari duplikasi data

#### 2. Controller (`/controllers/tokenWithdrawToFiatController.ts`)

**Functions:**

- `fetchAndSaveTokenWithdrawToFiat`: Query Goldsky dan simpan ke database
- `getTokenWithdrawToFiatHistory`: Ambil history berdasarkan receiver address
- `getTokenWithdrawToFiatByEscrow`: Ambil withdrawals berdasarkan escrow ID

#### 3. Routes (`/routes/tokenWithdrawToFiat.ts`)

```
POST /tokenWithdrawToFiat/fetch - Fetch dan simpan data dari Goldsky
GET /tokenWithdrawToFiat/history/:receiver - History untuk receiver
GET /tokenWithdrawToFiat/escrow/:escrowId - Withdrawals untuk escrow tertentu
```

### Frontend Components

#### 1. API Functions (`/app/api/api.tsx`)

**New Functions:**

- `fetchTokenWithdrawnToFiat`: Query langsung ke Goldsky
- `saveTokenWithdrawToFiatToDatabase`: Trigger backend untuk fetch & save
- `getTokenWithdrawToFiatHistory`: Ambil history dari database

**Updated Functions:**

- `loadAllWithdrawHistory`: Sekarang mengambil data dari database tokenWithdrawToFiat

#### 2. Smart Contract Integration (`/lib/smartContract.ts`)

**Updated Function:**

- `withdrawUSDCTofiat`: Setelah withdrawal berhasil, otomatis trigger penyimpanan data ke database

#### 3. Receiver History Page (`/app/history/receiver/page.tsx`)

**Updates:**

- Menggunakan `saveTokenWithdrawToFiatToDatabase` untuk update data terbaru
- Menampilkan data dari database dengan format yang sesuai

## 🔄 Data Flow

### 1. Withdrawal Process

```
User initiates withdrawal → withdrawUSDCTofiat() →
Blockchain transaction → Save to event tracking →
Trigger saveTokenWithdrawToFiatToDatabase() →
Query Goldsky → Save to MongoDB
```

### 2. History Display Process

```
User opens history page → saveTokenWithdrawToFiatToDatabase() →
loadAllWithdrawHistory() → GET /tokenWithdrawToFiat/history →
Display formatted data
```

## 📊 Database Schema

### Collection: `tokenWithdrawToFiat`

```json
{
  "_id": "ObjectId",
  "blockNumber": "12345678",
  "amount": "1000000", // Amount in wei/smallest unit
  "contractId": "0x123...",
  "depositWallet": "0xabc...",
  "escrowId": "0xdef...",
  "chainId": "goldsky_unique_id", // Unique identifier from Goldsky
  "receiver": "0x789...",
  "timestamp": "1697123456",
  "transactionHash": "0x456...",
  "createdAt": "2023-10-12T10:30:00.000Z",
  "updatedAt": "2023-10-12T10:30:00.000Z"
}
```

## 🚀 Usage Examples

### 1. Manual Data Sync

```javascript
// Trigger manual sync untuk receiver tertentu
await saveTokenWithdrawToFiatToDatabase(
  "0x1234567890123456789012345678901234567890"
);
```

### 2. Get History

```javascript
// Ambil history withdrawal untuk receiver
const history = await getTokenWithdrawToFiatHistory(
  "0x1234567890123456789012345678901234567890"
);
```

### 3. Backend API Calls

```bash
# Fetch dan save data dari Goldsky
curl -X POST http://localhost:3300/tokenWithdrawToFiat/fetch \
  -H "Content-Type: application/json" \
  -d '{"receiver": "0x1234567890123456789012345678901234567890"}'

# Get history
curl http://localhost:3300/tokenWithdrawToFiat/history/0x1234567890123456789012345678901234567890
```

## 🔍 GraphQL Query Used

```graphql
query FetchTokenWithdrawnToFiat($receiver: String!) {
  tokenWithdrawnToFiat(receiver: $receiver) {
    block_number
    amount
    contractId_
    depositWallet
    escrowId
    id
    receiver
    timestamp_
    transactionHash_
  }
}
```

## 📈 Benefits

1. **Real-time Data**: Setiap withdrawal otomatis tersimpan ke database
2. **Duplicate Prevention**: Unique constraint pada chainId mencegah duplikasi
3. **Performance**: Database query lebih cepat dari GraphQL untuk history display
4. **Reliability**: Data tersimpan lokal, tidak tergantung pada availability Goldsky
5. **Scalability**: Easy indexing dan querying untuk analisis lebih lanjut

## 🛠️ Error Handling

- **GraphQL Errors**: Logged dan dilaporkan ke user
- **Database Errors**: Tidak menggagalkan proses withdrawal utama
- **Network Issues**: Fallback ke data yang ada di database
- **Duplicate Data**: Automatically skipped berdasarkan chainId

## 🔧 Configuration

### Environment Variables Required:

```env
# Backend
GOLDSKY_API_URL=https://api.goldsky.com/api/public/project_xxx/subgraphs/xxx/gn

# Frontend
NEXT_PUBLIC_GOLDSKY_API_URL=https://api.goldsky.com/api/public/project_xxx/subgraphs/xxx/gn
NEXT_PUBLIC_API_BASE_URL=http://localhost:3300
```

## 📝 Testing

### Backend Server

```bash
cd movo-be
npm start
# Server running on port 3300
```

### Frontend Server

```bash
cd movo-fe
npm run dev
# Server running on port 3001
```

### Test Endpoints

- Backend: http://localhost:3300/tokenWithdrawToFiat/history/[receiver_address]
- Frontend: http://localhost:3001/history/receiver

## 🎯 Future Enhancements

1. **Real-time Updates**: WebSocket untuk real-time history updates
2. **Batch Processing**: Bulk sync untuk multiple receivers
3. **Analytics**: Dashboard untuk withdrawal analytics
4. **Notifications**: Email/push notifications untuk withdrawals
5. **Export**: CSV/PDF export functionality untuk history data
