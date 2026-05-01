# Colyseus Room Schema & Supabase Realtime Event Catalog

## Room: `EmpireRoom`
A single authoritative room per player session (or later, sharded by region).

### Server State Schema (TypeScript definition, Colyseus Schema)
```typescript
class EmpireState extends Schema {
  @type("string") phase: string; // "idle", "event_active"
  @type(Player) player: Player;
  @type({ map: Player }) players: MapSchema<Player>;
  @type([ MarketData ]) marketData: ArraySchema<MarketData>;
  @type([ ChatMessage ]) chatMessages: ArraySchema<ChatMessage>;
}

class Player extends Schema {
  @type("uint64") id: number;
  @type("string") username: string;
  @type("float64") cash: number;
  @type("float64") netWorth: number;
  @type("int32") reputation: number;
  @type("string") corporationId: string;
  // Server-only fields not exposed to client:
  // lastActiveTimestamp, offlineEarningsDue
}

class MarketData extends Schema {
  @type("string") symbol: string;
  @type("float64") price: number;
  @type("float64") changePercent: number;
  @type("float64") volume: number;
}
```

## Client ↔ Server Communication (Supabase Realtime)
All messages are JSON over WebSocket channels.
All messages are JSON over WebSocket.

### Client → Server (Events)
| Event | Payload | Description |
|-------|---------|-------------|
| `player:action` | `{ type: "buy_stock", data: { symbol, quantity } }` | Request to buy stock |
| `player:action` | `{ type: "sell_stock", data: { symbol, quantity } }` | Request to sell |
| `player:action` | `{ type: "upgrade_business", data: { businessId, upgradeType } }` | Upgrade a business |
| `player:action` | `{ type: "collect_offline" }` | Claim offline earnings |
| `marketplace:offer` | `{ itemType, itemId, price, quantity }` | Create a sell order |
| `marketplace:buy` | `{ orderId }` | Buy from a sell order |
| `corp:invite` | `{ targetPlayerId }` | Invite to corporation |
| `corp:accept` | `{ inviteId }` | Accept corp invite |
| `chat:send` | `{ message, channel ("global"/"corp"/"dm"), targetPlayerId }` | Send chat message |
| `ping` | `{}` | Heartbeat |

### Server → Client (Events)
| Event | Payload | Description |
|-------|---------|-------------|
| `state:patch` | `{ path, value }` | Incremental state update |
| `market:update` | `{ symbol, price, changePercent }` | Live stock price update |
| `transaction:result` | `{ success, message, data }` | Result of a player action |
| `offline:earnings` | `{ amount, minutesAway }` | Offline cash ready to collect |
| `corp:update` | `{ corporation }` | Corp changes (bank, members) |
| `chat:message` | `{ message }` | New chat message |
| `event:global` | `{ type, data }` | Global event (recession, boom) |
| `error` | `{ code, message }` | Validation error |
