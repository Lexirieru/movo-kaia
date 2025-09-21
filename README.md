# Movo — Multichain Cross-Border Payments

> **Multi-Chain Cross-Border Payments.**
> Multichain architecture, optional per-second salary streaming, and flexible fiat/crypto withdrawals.

---

## Overview

**Movo** is a multi-chain cross-border **payment** platform that makes international transfers **faster**, **more transparent**, and **more secure**.

* **Single-role per wallet**: one wallet = one role. Employers register receiver wallets; once a receiver connects, the account is auto-recognized—**no invites or approvals** needed.
* **Current focus**: Indonesia with **IDRX** (Rupiah stablecoin).
* **Expansion**: Korea (KRW), the US (USD), and additional markets—prioritizing **Asia-focused stablecoins** first, then scaling globally.
* **Long-term**: a global payment hub that integrates multiple **payment rails** (e.g., XSGD, Peso tokens, EURS) and future **CBDCs** when available.

---

## Vision & Mission

### Vision

Build an **inclusive payment infrastructure** that streamlines international transactions, minimizes friction, and gives seamless control to individuals and organizations worldwide.

### Mission

* **Empower users** with flexible access to earnings, in **fiat** or **crypto**.
* **Support businesses** with transparent and efficient payment tools.
* **Leverage blockchain** for accountability, immutability, and auditability.
* **Innovate** with **real-time per-second salary streaming** (optional).
* **Scale globally** via **multi-rail** integrations across countries.

---

## Why Movo Matters

* **Cost Efficiency**: Traditional cross-border transfers can cost \~5–10%. Movo reduces fees via stablecoins and efficient routing.
* **Speed**: Settlements in **minutes**, not days.
* **Transparency**: Every transaction is on-chain and indexed by backend services.
* **User Flexibility**: Withdraw to **bank accounts** (fiat) or **crypto wallets**.
* **Global Scalability**: **Integrate once** to reach receivers worldwide (IDRX, XSGD, EURS, etc.).
* **Innovation**: Optional **salary streaming per second**.

---

## Key Features

1. **Flexible Withdrawals (Crypto & Fiat)**
   Withdraw to **linked bank accounts** via fiat rails or to **crypto wallets** for immediate stablecoin access—ideal for employees, freelancers, and remote teams.

2. **Cross-Chain & Multi-Rail Capability**
   Multichain by design; integrates **blockchains + fiat rails**. Employers integrate once; Movo routes payouts by **speed, cost, and compliance**.

3. **Transparent & Auditable Invoices**
   Clear payment lifecycle: **PENDING → PAID → WITHDRAWN** with real-time status for both senders and receivers—**audit-ready** by default.

4. **Secure & Compliant Onboarding**
   **KYC/AML** via regulated partners (starting with **IDRX**). **Encrypted credentials** and **secure sessions** protect data and accounts.

5. **Real-Time Salary Streaming (Optional)**
   Per-second streaming unlocks **continuous access** to earnings, reduces operational overhead, and improves financial fairness.

---

## How It Works

* **Roles**:

  * **Sender** (business/individual paying)
  * **Receiver** (earns/withdraws)
  * One wallet corresponds to **one role**.

* **Onboarding flow**:

  1. Employer registers receiver’s wallet.
  2. Receiver connects that wallet → account is automatically recognized (no invite/approval).
  3. Sender creates **escrow** (optionally enables **vesting/streaming**), funds it, and confirms.
  4. Receiver **claims** to crypto, or **(coming soon)** to fiat bank rails.

### Demo Lifecycle (Example)

* **Sender**: Create escrow → choose token (e.g., USDT/IDRX) → set receiver & amount → (optionally preview vesting/streaming chart) → create → **top-up** if needed.
* **Receiver**: **Claim to crypto** now; **claim to fiat** is **coming soon**. Check **Profile** to verify receipt.

---

## Supported Chains & Rails

* **Chains (current)**:

  * **Kaia** — optimized for Asian markets, fast settlement
  * **Base** — Ethereum L2 with global liquidity access

* **Rails (current & planned)**:

  * **IDRX** (Indonesia) — current focus
  * **KRW**, **USD** and other **Asia-first stablecoins** (planned)
  * **CBDCs** (future, when/where available)

---

## Roadmap

* ✅ Indonesia launch with **IDRX**
* ✅ Multichain base: **Kaia** & **Base**
* 🚧 **Claim to Fiat** rails (receiver → bank)
* 🚧 **Additional tokens & chains** (EVM first)
* 🚧 **Asia-focused stablecoins** (XSGD, PHP Peso tokens, etc.)
* 🚧 **Advanced reporting & payments analytics**
* 🔭 **CBDC integrations** when/where available

---

## FAQ

**What is Movo used for?**
Cross-border **payments** with optional **per-second** streaming and flexible **fiat/crypto** withdrawals—great for exports/imports, remote teams, and vendor payouts across Asia and beyond.

**Do I need an account?**
Currently **no**. Connect a wallet; roles are auto-assigned (one wallet = one role).

**Which chains are supported right now?**
**Kaia** and **Base** (more EVM chains planned).

**Which tokens/rails are supported?**
**IDRX** today; expansion to **KRW**, **USD**, and other Asia-centric stablecoins next. **CBDCs** when available.

**Can I withdraw to a bank account?**
**Fiat withdrawals are coming soon.** Crypto withdrawals are available now.

---

## Deployment Addresses

### Kaia Test Deployment

**Mock Tokens**

* **MockMYRC**: `0x2c3a47fdF42a795196C80FFf1775920e562284B4` (18 decimals)
* **MockPHPC**: `0xe5959e5C96348a2275A93630b34cB37571d6C2E7` (6 decimals)
* **MockTNSGD**: `0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB` (6 decimals)
* **MockUSDC**: `0x4360a156F73663eee4581A4E8BFDbAB675F0A873` (6 decimals)
* **MockUSDT**: `0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045` (6 decimals)
* **MockIDRX**: `0x9B9D66405CDcAdbe5d1F300f67A1F89460e4C364` (6 decimals)

**Escrow Contracts**

* **Kaia Escrow**: `0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1`
* **Kaia EscrowIDRX**: `0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f`

**Frontend (Local Dev)**

* [http://192.168.100.231:3000](http://192.168.100.231:3000)

---

## Links

* Docs (GitBook): [https://movo-payment.gitbook.io/movo-kaia](https://movo-payment.gitbook.io/movo-kaia)
* Product Site (WIP): [https://liff.line.me/2008151328-ZB4k946b](https://liff.line.me/2008151328-ZB4k946b)
* GitHub: [https://github.com/Lexirieru/movo-kaia](https://github.com/Lexirieru/movo-kaia)

---
